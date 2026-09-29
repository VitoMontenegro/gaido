import { guidesUrl, portalUrl, servicesUrl, transportUrl } from '@gaido/site-urls/site'

export const PORTAL_SECTION_NAV = [
  { id: 'home', href: () => portalUrl('/'), label: 'Головна' },
  { id: 'guides', href: () => guidesUrl('/'), label: 'Екскурсії' },
  { id: 'transport', href: () => transportUrl('/'), label: 'Перевезення' },
  { id: 'services', href: () => servicesUrl('/'), label: 'Послуги' },
] as const
