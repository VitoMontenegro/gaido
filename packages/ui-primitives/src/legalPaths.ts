import type { LegalContent } from '@gaido/api-client/api/types/site'

export const LEGAL_SLUGS: Record<string, keyof LegalContent> = {
  privacy: 'privacy_policy',
  'site-rules': 'site_rules',
  'placement-rules': 'placement_rules',
}

export type LegalSlug = keyof typeof LEGAL_SLUGS

export function legalPath(slug: LegalSlug) {
  return `/legal/${slug}`
}
