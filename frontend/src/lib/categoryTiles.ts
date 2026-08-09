import type { HomeCategoryTile } from '../api/client'

export const DEFAULT_CATEGORY_TILES: HomeCategoryTile[] = [
  { label: 'Пошук', url: '/search', image_url: '/images/home/search.jpg' },
  { label: 'Карта', url: '/map', image_url: '/images/home/map.jpg' },
  { label: 'Гіди', url: '/guides', image_url: '/images/home/guides.jpg' },
  { label: 'Журнал', url: '/journal', image_url: '/images/home/journal.jpg' },
]

const JOURNAL_TILE: HomeCategoryTile = DEFAULT_CATEGORY_TILES[3]

/** Завжди показуємо «Журнал», навіть якщо в API/БД ще 3 плитки. */
export function normalizeCategoryTiles(tiles?: HomeCategoryTile[] | null): HomeCategoryTile[] {
  const base = tiles?.length ? [...tiles] : [...DEFAULT_CATEGORY_TILES]
  if (base.some((tile) => tile.url === '/journal')) return base
  return [...base, JOURNAL_TILE]
}
