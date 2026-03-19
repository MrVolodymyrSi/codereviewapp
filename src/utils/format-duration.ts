/**
 * Format elapsed seconds into MM:SS (under 1h) or H:MM:SS.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Derive duration from two ISO 8601 timestamps and format it.
 */
export function formatSessionDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return formatDuration(Math.max(0, Math.floor(ms / 1000)))
}
