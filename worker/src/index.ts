import type {
  AskRequest,
  GeminiContent,
  GeminiPart,
  HealthResponse,
  ProcessingMode,
  ThinkingLevel,
  VideoInfo,
} from '../../shared/types'
import { canonicalYouTubeUrl, parseYouTubeVideoId } from '../../shared/youtube'

export interface Env {
  ASSETS: Fetcher
  GATEWAY_RUNTIME_URL: string
  MODEL_ID: string
  ALLOWED_ORIGINS?: string
  GATEWAY_API_KEY?: string
  RATE_LIMITER?: RateLimit
}

const MAX_PROMPT_CHARS = 4000
const MAX_HISTORY_TURNS = 12
const MAX_OUTPUT_TOKENS = 8192
const THINKING_LEVELS: Record<ThinkingLevel, 'LOW' | 'MEDIUM' | 'HIGH'> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' }

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await handleApi(request, env, url)
        return withCors(request, env, response)
      } catch (error) {
        return withCors(request, env, errorResponse(error))
      }
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (url.pathname === '/api/health' && request.method === 'GET') {
    const body: HealthResponse = { ok: true, model: env.MODEL_ID, configured: Boolean(env.GATEWAY_API_KEY) }
    return Response.json(body)
  }
  if (url.pathname === '/api/video' && request.method === 'GET') {
    return handleVideoInfo(url.searchParams.get('url') ?? '')
  }
  if (url.pathname === '/api/ask' && request.method === 'POST') {
    await enforceRateLimit(request, env)
    return handleAsk(request, env)
  }
  throw new HttpError(404, 'not_found', '未找到。')
}

// YouTube oEmbed has no CORS headers, so the Worker relays title + thumbnail.
async function handleVideoInfo(rawUrl: string): Promise<Response> {
  const videoId = parseYouTubeVideoId(rawUrl)
  if (!videoId) throw new HttpError(400, 'invalid_video_url', '请输入公开的 YouTube 视频链接。')
  const canonical = canonicalYouTubeUrl(videoId)
  const info: VideoInfo = { videoId, url: canonical, thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }
  try {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
      signal: AbortSignal.timeout(3500),
    })
    if (oembed.ok) {
      const data = (await oembed.json()) as { title?: string; author_name?: string; thumbnail_url?: string }
      info.title = data.title
      info.authorName = data.author_name
      if (data.thumbnail_url) info.thumbnailUrl = data.thumbnail_url
    } else if (oembed.status === 401 || oembed.status === 403 || oembed.status === 404) {
      throw new HttpError(404, 'video_unavailable', '这个视频是私密、不公开列出或不存在的。Gemini 只能读取公开视频。')
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    // oEmbed hiccups must not block the demo; the embed still works.
  }
  return Response.json(info, { headers: { 'cache-control': 'public, max-age=300' } })
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  if (!env.GATEWAY_API_KEY) {
    throw new HttpError(503, 'not_configured', '服务端还没有配置 Gateway 凭证。')
  }
  const body = await readAskRequest(request)
  const videoId = parseYouTubeVideoId(body.videoUrl)
  if (!videoId) throw new HttpError(400, 'invalid_video_url', 'Enter a public YouTube video URL.')

  const contents = buildContents(body, canonicalYouTubeUrl(videoId))
  const thinkingLevel = THINKING_LEVELS[body.thinkingLevel ?? 'low']
  const geminiBody = {
    contents,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { includeThoughts: true, thinkingLevel },
    },
  }

  const requestId = `avg:${body.mode}:${crypto.randomUUID()}`
  const upstreamUrl = `${env.GATEWAY_RUNTIME_URL.replace(/\/+$/, '')}/gemini/v1beta/models/${encodeURIComponent(env.MODEL_ID)}:streamGenerateContent`
  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': env.GATEWAY_API_KEY,
      'x-request-id': requestId,
      ...(body.sessionId ? { 'x-session-id': `avg_${sanitizeSessionId(body.sessionId)}` } : {}),
    },
    body: JSON.stringify(geminiBody),
    signal: request.signal,
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    throw new HttpError(upstream.status === 429 ? 429 : 502, 'upstream_error', upstreamMessage(upstream.status, text))
  }

  // Relay the Gemini SSE stream byte-for-byte; the browser parses the chunks.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-request-id': requestId,
      'x-model-id': env.MODEL_ID,
    },
  })
}

async function readAskRequest(request: Request): Promise<AskRequest> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, 'invalid_json', '请求体必须是 JSON。')
  }
  if (!raw || typeof raw !== 'object') throw new HttpError(400, 'invalid_request', '请求体必须是对象。')
  const record = raw as Record<string, unknown>
  const videoUrl = typeof record.videoUrl === 'string' ? record.videoUrl : ''
  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : ''
  if (!prompt) throw new HttpError(400, 'empty_prompt', '请写下关于视频的问题。')
  if (prompt.length > MAX_PROMPT_CHARS)
    throw new HttpError(400, 'prompt_too_long', `提示词请控制在 ${MAX_PROMPT_CHARS} 个字符以内。`)
  if (record.mode !== 'agentic' && record.mode !== 'static')
    throw new HttpError(400, 'invalid_mode', 'mode 必须是 static 或 agentic。')
  const mode: ProcessingMode = record.mode
  const thinkingLevel = isThinkingLevel(record.thinkingLevel) ? record.thinkingLevel : 'low'
  const history = sanitizeHistory(record.history)
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId : undefined
  return { videoUrl, prompt, mode, thinkingLevel, history, sessionId }
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return value === 'low' || value === 'medium' || value === 'high'
}

// History is echoed to the model verbatim (thought signatures included) but
// capped, and only user/model roles with part arrays are accepted.
function sanitizeHistory(value: unknown): GeminiContent[] {
  if (!Array.isArray(value)) return []
  const contents: GeminiContent[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const { role, parts } = item as { role?: unknown; parts?: unknown }
    if ((role !== 'user' && role !== 'model') || !Array.isArray(parts)) continue
    const cleanParts = parts.filter((part): part is GeminiPart => Boolean(part) && typeof part === 'object')
    if (cleanParts.length === 0) continue
    contents.push({ role, parts: cleanParts })
  }
  // Keep whole turns: trim from the front in user+model pairs.
  const maxContents = MAX_HISTORY_TURNS * 2
  return contents.length > maxContents ? contents.slice(contents.length - maxContents) : contents
}

function buildContents(body: AskRequest, videoUrl: string): GeminiContent[] {
  const history = body.history ?? []
  const mediaProcessing = body.mode === 'agentic' ? 'AGENTIC' : 'STATIC'
  const hasVideoInHistory = history.some((content) => content.parts.some((part) => part.fileData?.fileUri))
  const userParts: GeminiPart[] = []
  if (!hasVideoInHistory) {
    userParts.push({ fileData: { fileUri: videoUrl, mimeType: 'video/*' }, mediaProcessing })
  }
  userParts.push({ text: body.prompt })
  return [...history, { role: 'user', parts: userParts }]
}

function sanitizeSessionId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

function upstreamMessage(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; code?: string | number } }
    const message = parsed.error?.message
    if (message) return `${message}（上游 ${status}）`
  } catch {
    // fall through
  }
  if (status === 402) return 'Gateway 账户余额不足（上游 402）。'
  if (status === 429) return 'Gateway 对这把 key 限流了（上游 429），请一分钟后重试。'
  return `模型网关返回了 ${status}。`
}

async function enforceRateLimit(request: Request, env: Env): Promise<void> {
  if (!env.RATE_LIMITER) return
  const ip = request.headers.get('cf-connecting-ip') ?? 'anonymous'
  const { success } = await env.RATE_LIMITER.limit({ key: ip })
  if (!success) throw new HttpError(429, 'rate_limited', '当前网络请求过于频繁，请一分钟后再试。')
}

function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: { code: error.code, message: error.message, status: error.status } },
      { status: error.status },
    )
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new Response(null, { status: 499 })
  }
  console.error('unhandled api error', error)
  return Response.json({ error: { code: 'internal_error', message: '出了点问题。', status: 500 } }, { status: 500 })
}

function withCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('origin')
  if (!origin) return response
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!allowed.includes(origin)) return response
  const headers = new Headers(response.headers)
  headers.set('access-control-allow-origin', origin)
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  headers.set('access-control-allow-headers', 'content-type')
  headers.set('vary', 'origin')
  return new Response(response.body, { status: response.status, headers })
}
