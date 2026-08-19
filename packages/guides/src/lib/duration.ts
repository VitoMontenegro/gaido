export type DurationParts = { days: number; hours: number; minutes: number }

export function minutesToDurationParts(minutes: number): DurationParts {
  const total = Math.max(0, Math.round(minutes))
  const days = Math.floor(total / (24 * 60))
  const remainder = total - days * 24 * 60
  return {
    days,
    hours: Math.floor(remainder / 60),
    minutes: remainder % 60,
  }
}

export function durationPartsToMinutes({ days, hours, minutes }: DurationParts): number {
  return Math.max(0, days) * 24 * 60 + Math.max(0, hours) * 60 + Math.max(0, minutes)
}

/** Minutes ↔ HH:MM (24h clock, e.g. 03:00 = 3 hours). */
export function minutesToDurationInput(minutes: number): string {
  const { hours, minutes: m } = minutesToDurationParts(minutes)
  return `${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

function hoursWord(h: number) {
  const n = Math.round(h)
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'година'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'години'
  return 'годин'
}

function daysWord(d: number) {
  const n = Math.abs(Math.round(d))
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дні'
  return 'днів'
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return ''
  const parts = minutesToDurationParts(minutes)
  const totalHours = minutes / 60

  if (parts.days > 0 || totalHours >= 24) {
    const d = Math.ceil(minutes / (24 * 60))
    return `${d} ${daysWord(d)}`
  }

  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `${h} ${hoursWord(h)}`
  }
  const label = Number.isInteger(totalHours) ? String(totalHours) : totalHours.toFixed(1).replace('.', ',')
  return `${label} ${hoursWord(Math.ceil(totalHours))}`
}
