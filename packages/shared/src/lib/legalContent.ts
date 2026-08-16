import type { LegalContent } from '../api/types/site'

export const DEFAULT_LEGAL_CONTENT: LegalContent = {
  privacy_policy: { title: 'Політика конфіденційності', body_html: '' },
  site_rules: { title: 'Правила сайту', body_html: '' },
  placement_rules: { title: 'Правила розміщення', body_html: '' },
}

export function normalizeLegalContent(legal?: Partial<LegalContent> | null): LegalContent {
  return {
    privacy_policy: { ...DEFAULT_LEGAL_CONTENT.privacy_policy, ...legal?.privacy_policy },
    site_rules: { ...DEFAULT_LEGAL_CONTENT.site_rules, ...legal?.site_rules },
    placement_rules: { ...DEFAULT_LEGAL_CONTENT.placement_rules, ...legal?.placement_rules },
  }
}
