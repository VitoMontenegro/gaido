/** Presets for guide form — shown as selectable chips before free-text notes. */
export const INCLUDED_PRESETS = [
  'Послуги гіда',
  'Вхідні квитки',
  'Транспорт по маршруту',
  'Трансфер',
  'Дегустації / частування',
  'Вода',
  'Фото на згадку',
] as const

export const EXCLUDED_PRESETS = [
  'Особисті витрати',
  'Чайові',
  'Харчування',
  'Вхідні квитки',
  'Проживання',
  'Дорога до місця старту',
] as const

export function normalizeItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
}

export function toggleItem(list: string[], item: string): string[] {
  const v = item.trim()
  if (!v) return list
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}
