import { dateKeyFromISO } from './calendarUtils'

type DatedSlot = { id: number; starts_at: string }

export function buildMonthDatePlan(keys: string[], slots: DatedSlot[]) {
  const byDay = new Map<string, DatedSlot[]>()
  for (const slot of slots) {
    const key = dateKeyFromISO(slot.starts_at)
    byDay.set(key, [...(byDay.get(key) ?? []), slot])
  }
  const remove = keys.length > 0 && keys.every((key) => (byDay.get(key)?.length ?? 0) > 0)
  const addDates: string[] = []
  const removeIds: number[] = []
  for (const key of keys) {
    const existing = byDay.get(key) ?? []
    if (remove) removeIds.push(...existing.map((slot) => slot.id))
    else if (!existing.length) addDates.push(key)
  }
  return { remove, addDates, removeIds }
}
