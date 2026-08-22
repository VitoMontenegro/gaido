import type { HomeCategoryTile } from '@gaido/api-client/api/client'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'

export const DEFAULT_CATEGORY_TILES: HomeCategoryTile[] = [
  { label: 'Пошук', url: '/search', image_url: staticAssetUrl('/images/home/search.jpg') },
  { label: 'Карта', url: '/map', image_url: staticAssetUrl('/images/home/map.jpg') },
  { label: 'Гіди', url: '/guides/countries', image_url: staticAssetUrl('/images/home/guides.jpg') },
  { label: 'Журнал', url: '/journal', image_url: staticAssetUrl('/images/home/journal.jpg') },
]

const JOURNAL_TILE: HomeCategoryTile = DEFAULT_CATEGORY_TILES[3]

/** Завжди показуємо «Журнал», навіть якщо в API/БД ще 3 плитки. */
export function normalizeCategoryTiles(tiles?: HomeCategoryTile[] | null): HomeCategoryTile[] {
  const base = tiles?.length ? [...tiles] : [...DEFAULT_CATEGORY_TILES]
  const withJournal = base.some((tile) => tile.url === '/journal') ? base : [...base, JOURNAL_TILE]
  return withJournal.map((tile) => ({
    ...tile,
    image_url: tile.image_url ? staticAssetUrl(tile.image_url) : tile.image_url,
  }))
}
