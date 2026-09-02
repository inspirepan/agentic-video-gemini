import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import type {
  AskRequest,
  GeminiContent,
  GeminiPart,
  GeminiStreamChunk,
  GeminiUsageMetadata,
  HealthResponse,
  ProcessingMode,
  ThinkingLevel,
  VideoInfo,
} from '../../shared/types'
import { accumulateParts } from '../lib/gemini'
import { readSseJson } from '../lib/sse'

export type TurnStatus = 'streaming' | 'done' | 'error' | 'aborted'

export type Turn = {
  id: string
  prompt: string
  userParts: GeminiPart[]
  modelParts: GeminiPart[]
  status: TurnStatus
  error?: string
  startedAt: number
  firstTokenAt?: number
  endedAt?: number
  usage?: GeminiUsageMetadata
  finishReason?: string
}

export type ColumnState = { mode: ProcessingMode; turns: Turn[] }

export const MODES: ProcessingMode[] = ['static', 'agentic']

type State = {
  video: VideoInfo | null
  videoLoading: boolean
  videoError: string | null
  columns: Record<ProcessingMode, ColumnState>
  thinkingLevel: ThinkingLevel
  showThinking: boolean
  health: HealthResponse | null
}

type Action =
  | { type: 'video/loading' }
  | { type: 'video/loaded'; video: VideoInfo }
  | { type: 'video/error'; message: string }
  | { type: 'video/clear' }
  | { type: 'turn/start'; mode: ProcessingMode; turn: Turn }
  | { type: 'turn/parts'; mode: ProcessingMode; turnId: string; parts: GeminiPart[]; at: number }
  | { type: 'turn/usage'; mode: ProcessingMode; turnId: string; usage: GeminiUsageMetadata; finishReason?: string }
  | {
      type: 'turn/finish'
      mode: ProcessingMode
      turnId: string
      status: Exclude<TurnStatus, 'streaming'>
      at: number
      error?: string
    }
  | { type: 'thinking/set'; level: ThinkingLevel }
  | { type: 'showThinking/set'; value: boolean }
  | { type: 'turns/clear' }
  | { type: 'turn/remove'; mode: ProcessingMode; turnId: string }
  | { type: 'health/set'; health: HealthResponse }

const emptyColumns = (): Record<ProcessingMode, ColumnState> => ({
  static: { mode: 'static', turns: [] },
  agentic: { mode: 'agentic', turns: [] },
})

const initialState: State = {
  video: null,
  videoLoading: false,
  videoError: null,
  columns: emptyColumns(),
  thinkingLevel: 'medium',
  showThinking: true,
  health: null,
}

function updateTurn(state: State, mode: ProcessingMode, turnId: string, update: (turn: Turn) => Turn): State {
  const column = state.columns[mode]
  const turns = column.turns.map((turn) => (turn.id === turnId ? update(turn) : turn))
  return { ...state, columns: { ...state.columns, [mode]: { ...column, turns } } }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'video/loading':
      return { ...state, videoLoading: true, videoError: null }
    case 'video/loaded':
      return { ...state, video: action.video, videoLoading: false, videoError: null, columns: emptyColumns() }
    case 'video/error':
      return { ...state, videoLoading: false, videoError: action.message }
    case 'video/clear':
      return { ...state, video: null, videoError: null, columns: emptyColumns() }
    case 'turn/start': {
      const column = state.columns[action.mode]
      return {
        ...state,
        columns: { ...state.columns, [action.mode]: { ...column, turns: [...column.turns, action.turn] } },
      }
    }
    case 'turn/parts':
      return updateTurn(state, action.mode, action.turnId, (turn) => ({
        ...turn,
        modelParts: accumulateParts(turn.modelParts, action.parts),
        firstTokenAt: turn.firstTokenAt ?? action.at,
      }))
    case 'turn/usage':
      return updateTurn(state, action.mode, action.turnId, (turn) => ({
        ...turn,
        usage: action.usage,
        finishReason: action.finishReason ?? turn.finishReason,
      }))
    case 'turn/finish':
      return updateTurn(state, action.mode, action.turnId, (turn) => ({
        ...turn,
        status: action.status,
        endedAt: action.at,
        ...(action.error ? { error: action.error } : {}),
      }))
    case 'thinking/set':
      return { ...state, thinkingLevel: action.level }
    case 'showThinking/set':
      return { ...state, showThinking: action.value }
    case 'turns/clear':
      return { ...state, columns: emptyColumns() }
    case 'turn/remove': {
      const column = state.columns[action.mode]
      return {
        ...state,
        columns: {
          ...state.columns,
          [action.mode]: { ...column, turns: column.turns.filter((turn) => turn.id !== action.turnId) },
        },
      }
    }
    case 'health/set':
      return { ...state, health: action.health }
  }
}

// Vertex AI (v1beta1 REST) strips the tool_call / tool_response content from
// agentic video steps and leaves bare thought signatures. Echoing those bare
// parts back is rejected with "Invalid thought signature", so history keeps
// only content-bearing parts (text, with any signature riding on them). The
// model then re-navigates the video for follow-ups instead of reusing context.
function isBareSignature(part: GeminiPart): boolean {
  return (
    typeof part.thoughtSignature === 'string' &&
    Object.keys(part).every((key) => key === 'thoughtSignature' || key === 'thought')
  )
}

export function historyPartsFor(modelParts: GeminiPart[]): GeminiPart[] {
  return modelParts.filter((part) => !isBareSignature(part))
}

function historyFor(column: ColumnState): GeminiContent[] {
  const contents: GeminiContent[] = []
  for (const turn of column.turns) {
    if (turn.status !== 'done' || turn.modelParts.length === 0) continue
    const modelParts = historyPartsFor(turn.modelParts)
    if (modelParts.length === 0) continue
    contents.push({ role: 'user', parts: turn.userParts })
    contents.push({ role: 'model', parts: modelParts })
  }
  return contents
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    if (body.error?.message) return body.error.message
  } catch {
    // not JSON
  }
  return `请求失败（${response.status}）。`
}

export function useComparison() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef(crypto.randomUUID().replace(/-/g, '').slice(0, 24))

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((response) => (response.ok ? (response.json() as Promise<HealthResponse>) : null))
      .then((health) => {
        if (health && !cancelled) dispatch({ type: 'health/set', health })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const loadVideo = useCallback(async (url: string) => {
    abortRef.current?.abort()
    dispatch({ type: 'video/loading' })
    try {
      const response = await fetch(`/api/video?url=${encodeURIComponent(url)}`)
      if (!response.ok) throw new Error(await readApiError(response))
      const video = (await response.json()) as VideoInfo
      dispatch({ type: 'video/loaded', video })
    } catch (error) {
      dispatch({ type: 'video/error', message: error instanceof Error ? error.message : '无法加载这个视频。' })
    }
  }, [])

  const clearVideo = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ type: 'video/clear' })
  }, [])

  const stateRef = useRef(state)
  stateRef.current = state

  const streamTurn = useCallback(
    async (mode: ProcessingMode, turn: Turn, video: VideoInfo, thinkingLevel: ThinkingLevel, signal: AbortSignal) => {
      const history = historyFor(stateRef.current.columns[mode])
      const request: AskRequest = {
        videoUrl: video.url,
        prompt: turn.prompt,
        mode,
        thinkingLevel,
        history,
        sessionId: sessionIdRef.current,
      }
      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
          signal,
        })
        if (!response.ok || !response.body) throw new Error(await readApiError(response))
        let sawTerminalChunk = false
        for await (const chunk of readSseJson<GeminiStreamChunk>(response.body)) {
          if (chunk.error) throw new Error(chunk.error.message ?? '模型返回了错误。')
          const candidate = chunk.candidates?.[0]
          const parts = candidate?.content?.parts
          if (parts && parts.length > 0) {
            dispatch({ type: 'turn/parts', mode, turnId: turn.id, parts, at: performance.now() })
          }
          const usage = chunk.usageMetadata
          if (usage && Object.keys(usage).some((key) => key !== 'trafficType')) {
            sawTerminalChunk = true
            dispatch({ type: 'turn/usage', mode, turnId: turn.id, usage, finishReason: candidate?.finishReason })
          } else if (candidate?.finishReason) {
            sawTerminalChunk = true
            dispatch({ type: 'turn/usage', mode, turnId: turn.id, usage: {}, finishReason: candidate.finishReason })
          }
        }
        if (!sawTerminalChunk) {
          // Vertex occasionally closes an agentic stream after the first tool
          // steps without a final chunk; surface it instead of a silent blank.
          throw new Error('流在模型完成前就结束了（Vertex AI 没有返回最终 chunk）。请重试这个问题。')
        }
        dispatch({ type: 'turn/finish', mode, turnId: turn.id, status: 'done', at: performance.now() })
      } catch (error) {
        if (signal.aborted) {
          dispatch({ type: 'turn/finish', mode, turnId: turn.id, status: 'aborted', at: performance.now() })
          return
        }
        const message = error instanceof Error ? error.message : '出了点问题。'
        dispatch({ type: 'turn/finish', mode, turnId: turn.id, status: 'error', at: performance.now(), error: message })
      }
    },
    [],
  )

  const ask = useCallback(
    (prompt: string) => {
      const current = stateRef.current
      const video = current.video
      const trimmed = prompt.trim()
      if (!video || !trimmed) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const now = performance.now()
      for (const mode of MODES) {
        const column = current.columns[mode]
        const hasVideoInHistory = column.turns.some((turn) => turn.status === 'done' && turn.modelParts.length > 0)
        const userParts: GeminiPart[] = hasVideoInHistory
          ? [{ text: trimmed }]
          : [
              {
                fileData: { fileUri: video.url, mimeType: 'video/*' },
                mediaProcessing: mode === 'agentic' ? 'AGENTIC' : 'STATIC',
              },
              { text: trimmed },
            ]
        const turn: Turn = {
          id: `${mode}-${crypto.randomUUID()}`,
          prompt: trimmed,
          userParts,
          modelParts: [],
          status: 'streaming',
          startedAt: now,
        }
        dispatch({ type: 'turn/start', mode, turn })
        void streamTurn(mode, turn, video, current.thinkingLevel, controller.signal)
      }
    },
    [streamTurn],
  )

  const retry = useCallback(
    (mode: ProcessingMode, turnId: string) => {
      const current = stateRef.current
      const video = current.video
      const failed = current.columns[mode].turns.find((turn) => turn.id === turnId)
      if (!video || !failed || failed.status === 'streaming') return
      dispatch({ type: 'turn/remove', mode, turnId })
      const controller = abortRef.current && !abortRef.current.signal.aborted ? abortRef.current : new AbortController()
      abortRef.current = controller
      const turn: Turn = {
        ...failed,
        id: `${mode}-${crypto.randomUUID()}`,
        modelParts: [],
        status: 'streaming',
        startedAt: performance.now(),
        error: undefined,
        usage: undefined,
        firstTokenAt: undefined,
        endedAt: undefined,
        finishReason: undefined,
      }
      dispatch({ type: 'turn/start', mode, turn })
      void streamTurn(mode, turn, video, current.thinkingLevel, controller.signal)
    },
    [streamTurn],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearTurns = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ type: 'turns/clear' })
  }, [])

  const setThinkingLevel = useCallback((level: ThinkingLevel) => dispatch({ type: 'thinking/set', level }), [])
  const setShowThinking = useCallback((value: boolean) => dispatch({ type: 'showThinking/set', value }), [])

  const busy = useMemo(
    () => MODES.some((mode) => state.columns[mode].turns.at(-1)?.status === 'streaming'),
    [state.columns],
  )
  const hasTurns = useMemo(() => MODES.some((mode) => state.columns[mode].turns.length > 0), [state.columns])

  return {
    state,
    busy,
    hasTurns,
    loadVideo,
    clearVideo,
    ask,
    stop,
    retry,
    clearTurns,
    setThinkingLevel,
    setShowThinking,
  }
}

export type Comparison = ReturnType<typeof useComparison>
