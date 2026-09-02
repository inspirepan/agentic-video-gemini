// Minimal SSE reader for Gemini's streamGenerateContent (`data: {json}` frames,
// CRLF or LF separated). Yields each parsed JSON payload.
export async function* readSseJson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const payload = frameData(frame)
        if (payload) yield parseFrame<T>(payload)
        boundary = buffer.indexOf('\n\n')
      }
    }
    buffer += decoder.decode()
    const tail = frameData(buffer)
    if (tail) yield parseFrame<T>(tail)
  } finally {
    reader.releaseLock()
  }
}

// Vertex AI can append a bare JSON error object (no `data:` prefix) after the
// SSE frames, e.g. a mid-stream 429. Surface it so the client can show it.
function frameData(frame: string): string | null {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')
  if (data && data !== '[DONE]') return data
  const bare = frame.trim()
  if (bare.startsWith('{') && bare.endsWith('}')) return bare
  return null
}

function parseFrame<T>(payload: string): T {
  try {
    return JSON.parse(payload) as T
  } catch {
    return { error: { message: `流数据帧格式异常：${payload.slice(0, 120)}` } } as T
  }
}
