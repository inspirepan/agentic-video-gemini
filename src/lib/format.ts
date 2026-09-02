const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('zh-CN')

export function formatTokens(value: number | undefined): string {
  if (value == null) return '—'
  return value >= 10_000 ? compact.format(value) : plain.format(value)
}

export function formatTokensExact(value: number | undefined): string {
  return value == null ? '—' : plain.format(value)
}

export function formatSeconds(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
}

export function formatUsd(value: number | undefined): string {
  if (value == null) return '—'
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(3)}`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function containsCjkScript(text: string): boolean {
  return /[぀-ヿ㐀-䶿一-鿿가-힯]/.test(text)
}
