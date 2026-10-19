import { COUNTRY_META, type ContinentId } from './countryMeta.data'

export type { ContinentId }
export { COUNTRY_META }

export type RegionId = 'all' | ContinentId

export const REGION_OPTIONS: { id: RegionId; label: string }[] = [
  { id: 'all', label: 'Усі' },
  { id: 'europe', label: 'Європа' },
  { id: 'asia', label: 'Азія' },
  { id: 'americas', label: 'Америка' },
  { id: 'africa', label: 'Африка' },
  { id: 'oceania', label: 'Австралія та Океанія' },
]

export const UK_ALPHABET = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('')

export function countryContinent(slug: string): ContinentId | null {
  return COUNTRY_META[slug]?.continent ?? null
}

export function countryCca2(slug: string): string {
  const code = COUNTRY_META[slug]?.cca2?.toLowerCase() ?? ''
  return /^[a-z]{2}$/.test(code) ? code : ''
}

export function countryFirstLetter(name: string): string {
  const char = name.trim().charAt(0)
  return char ? char.toLocaleUpperCase('uk') : ''
}
