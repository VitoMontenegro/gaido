const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const

export type CalendarDateItem = {
  id?: number
  date: string
  price?: number
  currency?: string
  starts_at?: string
  ends_at?: string
}

export function dateKeyFromISO(iso: string): string {
  return iso.slice(0, 10)
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number)
  return { year: y, month: m, day: d }
}

export function compactPrice(price: number, currency = 'EUR'): string {
  const code = currency.toUpperCase()
  const symbol = code === 'EUR' ? '€' : code === 'RUB' ? '₽' : code === 'USD' ? '$' : code
  return `${Math.round(price)} ${symbol}`
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function upcomingMonths(count: number, from = new Date()): Array<{ year: number; month: number }> {
  const startYear = from.getFullYear()
  const startMonth = from.getMonth() + 1
  return Array.from({ length: count }, (_, i) => addMonths(startYear, startMonth, i))
}

export function monthLabelShort(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  const name = d.toLocaleDateString('uk-UA', { month: 'long' })
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

export function monthLabel(year: number, month: number): string {
  return `${monthLabelShort(year, month)} ${year}`
}


export function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startOffset = (first.getDay() + 6) % 7
  const cells: Array<{ day: number | null; dateKey: string | null }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateKey: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateKey: toDateKey(year, month, d) })
  }
  return cells
}

export function weekdayShortUk(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('uk-UA', { weekday: 'short' }).replace('.', '')
}

export function monthLabelUpper(year: number, month: number): string {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }).toUpperCase()
}

export function formatTimeFromISO(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

export function groupDatesByMonth(dates: CalendarDateItem[]) {
  const map = new Map<string, { year: number; month: number; items: CalendarDateItem[] }>()
  for (const item of dates) {
    const { year, month } = parseDateKey(item.date)
    const key = `${year}-${month}`
    const group = map.get(key)
    if (group) group.items.push(item)
    else map.set(key, { year, month, items: [item] })
  }
  return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month)
}

export const PARUS_CALENDAR_SHELL =
  'flex flex-col gap-4 rounded-[32px] sm:border sm:border-[#eeeeee] bg-white sm:py-3 sm:px-4 sm:shadow-[0_0_20px_0_rgba(15,26,40,0.04)]'

export function isWeekend(dateKey: string): boolean {
  const { year, month, day } = parseDateKey(dateKey)
  const wd = new Date(year, month - 1, day).getDay()
  return wd === 0 || wd === 6
}

export function isPastDate(dateKey: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { year, month, day } = parseDateKey(dateKey)
  const target = new Date(year, month - 1, day)
  return target < today
}

export { WEEKDAYS }
