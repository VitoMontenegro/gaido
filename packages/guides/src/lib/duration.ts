/** Minutes ↔ HH:MM (24h clock, e.g. 03:00 = 3 hours). */

export function minutesToDurationInput(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function durationInputToMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return 0
  const h = Number(match[1])
  const m = Number(match[2])
  if (!Number.isFinite(h) || !Number.isFinite(m) || m >= 60) return 0
  return h * 60 + m
}

export function formatDurationClock(minutes: number): string {
  if (minutes <= 0) return ''
  return minutesToDurationInput(minutes)
}
