import type { Excursion, PublicGuide } from './catalog'

export type HomeStat = { value: string; label: string }
export type HomeBenefit = { title: string; text: string }
export type HomeFAQ = { question: string; answer: string }
export type HomeCategoryTile = { label: string; url: string; image_url: string }
export type HomeCta = {
  title: string
  text: string
  schedule: string
  primary_label: string
  primary_url: string
  secondary_label: string
  secondary_url: string
}

export type HomeContent = {
  hero_title: string
  hero_subtitle: string
  category_tiles: HomeCategoryTile[]
  about_title: string
  about_text: string
  about_image_url: string
  about_button_label: string
  about_button_url: string
  cta: HomeCta
  stats_title: string
  stats: HomeStat[]
  benefits: HomeBenefit[]
  faq: HomeFAQ[]
  featured_guide_slugs: string[]
  featured_excursion_slugs: string[]
  popular_city_slugs: string[]
}

export type FooterLink = { label: string; url: string }
export type FooterColumn = { title: string; links: FooterLink[] }

export type FooterContent = {
  phone: string
  email: string
  telegram: string
  description: string
  columns: FooterColumn[]
  copyright: string
}

export type LegalPage = { title: string; body_html: string }

export type LegalContent = {
  privacy_policy: LegalPage
  site_rules: LegalPage
  placement_rules: LegalPage
}

export type AboutAudienceItem = {
  title: string
  description: string
}

export type AboutPageContent = {
  hero_eyebrow: string
  hero_title: string
  hero_lead: string
  story: string[]
  belief: string
  audience_title: string
  audience_lead: string
  audience: AboutAudienceItem[]
  disclaimer: string
  mission: string
  tagline: string
  closing: string
}

export type DestinationCity = { slug: string; name: string }
export type DestinationGroup = {
  country_slug: string
  country_name: string
  cities: DestinationCity[]
}

export type SitePayload = {
  home: {
    content: HomeContent
    featured_guides: PublicGuide[]
    featured_excursions: Excursion[]
    popular_destinations: DestinationGroup[]
  }
  footer: FooterContent
  legal: LegalContent
  about: AboutPageContent
  telegram_bot_url?: string
}

export type SiteContentPayload = {
  home: HomeContent
  footer: FooterContent
  legal: LegalContent
  about: AboutPageContent
}
