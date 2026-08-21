import { getSiteMode, GUIDES_HOST, SERVICES_HOST, TRANSPORT_HOST } from './site'

export const SITE_TAGLINE = 'Для українців — від українців'

/** Public media key for default Open Graph / Twitter preview image */
export const DEFAULT_OG_IMAGE_KEY = 'd2b27d81f09874a08b4dc3293fe67f2e.webp'

export function getSiteName(): string {
  switch (getSiteMode()) {
    case 'guides':
      return 'Gaido'
    case 'transport':
      return 'Gaido Vezu'
    case 'services':
      return 'Gaido Servis'
    default:
      return 'Gaido'
  }
}

export const SITE_NAME = getSiteName()

export function pageTitle(suffix?: string) {
  const name = getSiteName()
  return suffix ? `${suffix} — ${name}` : name
}

export function guidesSiteLabel(): string {
  return GUIDES_HOST
}

export function transportSiteLabel(): string {
  return TRANSPORT_HOST
}

export function servicesSiteLabel(): string {
  return SERVICES_HOST
}
