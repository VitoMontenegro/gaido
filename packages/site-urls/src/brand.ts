import { getSiteMode, GUIDES_PREFIX, PORTAL_HOST, SERVICES_PREFIX, TRANSPORT_PREFIX } from './site'

export const SITE_TAGLINE = 'Для українців — від українців'

/** Public media key for default Open Graph / Twitter preview image */
export const DEFAULT_OG_IMAGE_KEY = 'd2b27d81f09874a08b4dc3293fe67f2e.webp'

export function getSiteName(): string {
  switch (getSiteMode()) {
    case 'guides':
      return 'Gaido UA'
    case 'transport':
      return 'Gaido UA'
    case 'services':
      return 'Gaido UA'
    default:
      return 'Gaido UA'
  }
}

export const SITE_NAME = getSiteName()

/** One meta description, cut on a word boundary so the snippet is not mid-word. */
export function clipMetaDescription(value: string, max = 160) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return (space > max / 2 ? cut.slice(0, space) : cut).trim()
}

export function pageTitle(suffix?: string) {
  const name = getSiteName()
  return suffix ? `${suffix} — ${name}` : name
}

export function guidesSiteLabel(): string {
  return `${PORTAL_HOST}${GUIDES_PREFIX}`
}

export function transportSiteLabel(): string {
  return `${PORTAL_HOST}${TRANSPORT_PREFIX}`
}

export function servicesSiteLabel(): string {
  return `${PORTAL_HOST}${SERVICES_PREFIX}`
}
