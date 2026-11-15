import type { PublicGuide } from '@gaido/api-client/api/client'

/** Guides with more published excursions come first. Equal counts keep the previous order. */
export function rankGuidesByExcursions(guides: PublicGuide[]) {
  return [...guides].sort(
    (a, b) => (b.excursion_count ?? 0) - (a.excursion_count ?? 0),
  )
}

/** Profile link stays only when the guide has published excursions, or the page opts in. */
export function guideCardLinked(guide: PublicGuide, alwaysLink = false) {
  if (alwaysLink) return true
  if (typeof guide.excursion_count !== 'number') return true
  return guide.excursion_count > 0
}
