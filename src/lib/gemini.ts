import type { GeminiModalityTokens, GeminiPart, GeminiUsageMetadata } from '../../shared/types'

// --- Part accumulation ------------------------------------------------------

function isTextOnly(part: GeminiPart): boolean {
  return (
    typeof part.text === 'string' &&
    Object.keys(part).every((key) => key === 'text' || key === 'thought' || key === 'thoughtSignature')
  )
}

/**
 * Merge a streamed chunk's parts into the running list. Consecutive text deltas
 * of the same kind (thought / answer) collapse into one part so the history the
 * client echoes back stays compact; a signature riding on the last delta is
 * carried onto the merged part.
 */
export function accumulateParts(existing: GeminiPart[], incoming: GeminiPart[]): GeminiPart[] {
  const next = existing.slice()
  for (const part of incoming) {
    const last = next[next.length - 1]
    if (
      last &&
      isTextOnly(part) &&
      isTextOnly(last) &&
      Boolean(last.thought) === Boolean(part.thought) &&
      !last.thoughtSignature
    ) {
      next[next.length - 1] = {
        ...last,
        text: `${last.text ?? ''}${part.text ?? ''}`,
        ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
      }
      continue
    }
    next.push(part)
  }
  return next
}

// --- Trace projection -------------------------------------------------------

export type ToolStep = {
  kind: 'tool'
  id: string
  index: number
  call: GeminiPart
  result: GeminiPart | null
}

export type TraceItem =
  { kind: 'thought'; id: string; text: string } | ToolStep | { kind: 'text'; id: string; text: string }

function isSignatureOnly(part: GeminiPart): boolean {
  const keys = Object.keys(part)
  return (
    keys.length > 0 &&
    keys.every((key) => key === 'thoughtSignature' || key === 'thought') &&
    typeof part.thoughtSignature === 'string'
  )
}

function isToolCall(part: GeminiPart): boolean {
  return part.toolCall != null
}

function isToolResult(part: GeminiPart): boolean {
  return part.toolResponse != null
}

/**
 * Project raw model parts onto what the transcript shows. Agentic video
 * surfaces its server-side tool use as `toolCall` / `toolResponse` parts on
 * the Gemini API and as bare signature parts on Vertex AI; both collapse to
 * call → result steps here.
 */
export function projectTrace(parts: GeminiPart[]): TraceItem[] {
  const items: TraceItem[] = []
  let openStep: ToolStep | null = null
  let stepIndex = 0
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]
    if (typeof part.text === 'string' && part.text.length > 0) {
      openStep = null
      items.push({ kind: part.thought ? 'thought' : 'text', id: `p${i}`, text: part.text })
      continue
    }
    const explicitCall = isToolCall(part)
    const explicitResult = isToolResult(part)
    const opaque = !explicitCall && !explicitResult && isSignatureOnly(part)
    if (explicitResult || (opaque && openStep)) {
      if (openStep) {
        openStep.result = part
        openStep = null
      } else {
        stepIndex += 1
        items.push({ kind: 'tool', id: `p${i}`, index: stepIndex, call: part, result: null })
      }
      continue
    }
    if (explicitCall || opaque) {
      stepIndex += 1
      openStep = { kind: 'tool', id: `p${i}`, index: stepIndex, call: part, result: null }
      items.push(openStep)
    }
  }
  return items
}

export function signatureBytes(part: GeminiPart | null): number | null {
  const signature = part?.thoughtSignature
  if (typeof signature !== 'string') return null
  // base64 → bytes
  const padding = signature.endsWith('==') ? 2 : signature.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((signature.length * 3) / 4) - padding)
}

// --- Usage / cost -----------------------------------------------------------

export type UsageBreakdown = {
  promptVideo: number
  promptAudio: number
  promptText: number
  promptOther: number
  toolImage: number
  toolText: number
  toolOther: number
  thoughts: number
  output: number
  total: number
  prompt: number
  toolUse: number
}

function modality(details: GeminiModalityTokens[] | undefined, name: string): number {
  return (details ?? []).filter((item) => item.modality === name).reduce((sum, item) => sum + item.tokenCount, 0)
}

function otherModalities(details: GeminiModalityTokens[] | undefined, known: string[]): number {
  return (details ?? [])
    .filter((item) => !known.includes(item.modality))
    .reduce((sum, item) => sum + item.tokenCount, 0)
}

export function breakdownUsage(usage: GeminiUsageMetadata | undefined): UsageBreakdown | null {
  if (!usage) return null
  const prompt = usage.promptTokenCount ?? 0
  const toolUse = usage.toolUsePromptTokenCount ?? 0
  const thoughts = usage.thoughtsTokenCount ?? 0
  const output = usage.candidatesTokenCount ?? 0
  return {
    promptVideo: modality(usage.promptTokensDetails, 'VIDEO'),
    promptAudio: modality(usage.promptTokensDetails, 'AUDIO'),
    promptText: modality(usage.promptTokensDetails, 'TEXT'),
    promptOther: otherModalities(usage.promptTokensDetails, ['VIDEO', 'AUDIO', 'TEXT']),
    toolImage:
      modality(usage.toolUsePromptTokensDetails, 'IMAGE') + modality(usage.toolUsePromptTokensDetails, 'VIDEO'),
    toolText: modality(usage.toolUsePromptTokensDetails, 'TEXT'),
    toolOther: otherModalities(usage.toolUsePromptTokensDetails, ['IMAGE', 'VIDEO', 'TEXT']),
    thoughts,
    output,
    total: usage.totalTokenCount ?? prompt + toolUse + thoughts + output,
    prompt,
    toolUse,
  }
}

// Gemini 3.7 Flash list price (USD per 1M tokens), promo pricing as of 2026-09.
export const PRICE_INPUT_PER_M = 0.75
export const PRICE_OUTPUT_PER_M = 3.75

export function estimateCostUsd(breakdown: UsageBreakdown): number {
  const input = breakdown.prompt + breakdown.toolUse
  const output = breakdown.thoughts + breakdown.output
  return (input * PRICE_INPUT_PER_M + output * PRICE_OUTPUT_PER_M) / 1_000_000
}

// --- Timestamps in answers → seekable links ---------------------------------

// Wrap `MM:SS` / `H:MM:SS` mentions as `#t=` links the markdown renderer turns
// into player seeks. Skips fenced code and anything that already sits in a link.
const BRACKETED_TIMESTAMP_PATTERN = /\[\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*\](?!\()/g
const TIMESTAMP_PATTERN = /(^|[\s(*_~–—>,;:])((?:\d{1,2}:)?\d{1,2}:\d{2})(?=$|[\s)*_.,;:!?–—~\]])(?!\]\()/gm

export function linkifyTimestamps(markdown: string): string {
  const segments = markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/)
  return segments
    .map((segment, index) => {
      if (index % 2 === 1) return segment
      const bracketed = segment.replace(BRACKETED_TIMESTAMP_PATTERN, (match, stamp: string) => {
        const seconds = clockToSeconds(stamp)
        return seconds == null ? match : `[${stamp}](#t=${seconds})`
      })
      return bracketed.replace(
        TIMESTAMP_PATTERN,
        (match, lead: string, stamp: string, offset: number, source: string) => {
          // Skip stamps that are already link text (preceded by "[").
          if (source[offset + lead.length - 1] === '[' || source.slice(offset + match.length).startsWith(']('))
            return match
          const seconds = clockToSeconds(stamp)
          return seconds == null ? match : `${lead}[${stamp}](#t=${seconds})`
        },
      )
    })
    .join('')
}

export function clockToSeconds(stamp: string): number | null {
  const pieces = stamp.split(':').map(Number)
  if (pieces.some((n) => !Number.isFinite(n))) return null
  if (pieces.length === 2) return pieces[0] * 60 + pieces[1]
  if (pieces.length === 3) return pieces[0] * 3600 + pieces[1] * 60 + pieces[2]
  return null
}
