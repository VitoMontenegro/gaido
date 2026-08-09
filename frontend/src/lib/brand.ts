export const SITE_NAME = 'Gaido'
export const SITE_TAGLINE = 'Гайдамо мандрувати!'

export function pageTitle(suffix?: string) {
  return suffix ? `${suffix} — ${SITE_NAME}` : SITE_NAME
}
