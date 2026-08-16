import { getSiteMode, GUIDES_HOST, SERVICES_HOST, TRANSPORT_HOST } from './site'

export const SITE_TAGLINE = 'Для українців — від українців'

export function getSiteName(): string {
  switch (getSiteMode()) {
    case 'guides':
      return 'Gaido Світ'
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
