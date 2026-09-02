// YouTube URL parsing shared by the SPA (preview) and the Worker (validation).

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
])
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (ID_PATTERN.test(trimmed)) return trimmed
  let url: URL
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (!HOSTS.has(url.hostname)) return null
  let id: string | null = null
  if (url.hostname.endsWith('youtu.be')) {
    id = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v')
  } else {
    const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)
    id = match?.[1] ?? null
  }
  return id && ID_PATTERN.test(id) ? id : null
}

export function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
