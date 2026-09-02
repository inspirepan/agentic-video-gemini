// Request / response contracts shared by the SPA and the Worker.

export type ProcessingMode = 'static' | 'agentic'
export type ThinkingLevel = 'low' | 'medium' | 'high'

// Gemini generateContent `Part`, kept loose on purpose: Vertex may add fields
// (tool calls, signatures) and the client echoes model parts back verbatim.
export type GeminiPart = {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  fileData?: { fileUri: string; mimeType?: string }
  mediaProcessing?: 'STATIC' | 'AGENTIC'
  toolCall?: Record<string, unknown>
  toolResponse?: Record<string, unknown>
  [key: string]: unknown
}

export type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export type GeminiModalityTokens = { modality: string; tokenCount: number }

export type GeminiUsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  toolUsePromptTokenCount?: number
  totalTokenCount?: number
  cachedContentTokenCount?: number
  promptTokensDetails?: GeminiModalityTokens[]
  candidatesTokensDetails?: GeminiModalityTokens[]
  toolUsePromptTokensDetails?: GeminiModalityTokens[]
  trafficType?: string
}

export type GeminiStreamChunk = {
  candidates?: Array<{
    content?: { role?: string; parts?: GeminiPart[] }
    finishReason?: string
  }>
  usageMetadata?: GeminiUsageMetadata
  modelVersion?: string
  responseId?: string
  error?: { code?: number; message?: string; status?: string }
}

export type AskRequest = {
  videoUrl: string
  prompt: string
  mode: ProcessingMode
  thinkingLevel?: ThinkingLevel
  // Prior turns of this column's conversation (user + model), echoed verbatim.
  history?: GeminiContent[]
  sessionId?: string
}

export type VideoInfo = {
  videoId: string
  url: string
  title?: string
  authorName?: string
  thumbnailUrl?: string
}

export type HealthResponse = {
  ok: boolean
  model: string
  configured: boolean
}

export type ApiError = {
  error: { code: string; message: string; status?: number }
}
