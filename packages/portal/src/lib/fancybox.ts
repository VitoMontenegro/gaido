export function guideTypeBadgeLabel(guide: { type_badge?: string; guide_type: string; catalog_status: string }) {
  if (guide.type_badge) return guide.type_badge
  if (guide.catalog_status === 'companion') return 'Компаньйон'
  if (guide.guide_type === 'ENTERTAINER') return 'Конферансьє'
  if (guide.guide_type === 'GUIDE') return 'Гід'
  return 'Гід'
}
