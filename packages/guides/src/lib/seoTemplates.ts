import { pageTitle } from '@gaido/site-urls/brand'
import { ukInLocative } from './ukLocative'

export function seoCountryExcursionsHeading(countryName: string) {
  return `Екскурсії українською ${ukInLocative(countryName)}`
}

export function seoCountryExcursionsTitle(countryName: string) {
  return pageTitle(seoCountryExcursionsHeading(countryName))
}

export function seoCountryExcursionsDescription(countryName: string, count?: number) {
  if (count && count > 0) {
    return `${count} екскурсій українською ${ukInLocative(countryName)} — ціни, гіди, авторські маршрути`
  }
  return `Екскурсії українською ${ukInLocative(countryName)} — ціни, гіди, авторські маршрути для українців`
}

export function seoCityExcursionsHeading(cityName: string) {
  return `Екскурсії українською ${ukInLocative(cityName)}`
}

export function seoCityExcursionsTitle(cityName: string) {
  return pageTitle(seoCityExcursionsHeading(cityName))
}

export function seoCityExcursionsDescription(cityName: string, countryName?: string) {
  const where = countryName ? `${ukInLocative(cityName)}, ${countryName}` : ukInLocative(cityName)
  return `Гіди та авторські екскурсії українською ${where} — бронювання напряму з гідом`
}

export function defaultCountryIntro(countryName: string) {
  return `Оберіть авторську екскурсію українською ${ukInLocative(countryName)} від місцевих гідів. Порівняйте ціни, перегляньте маршрути та напишіть гіду напряму для бронювання дати.`
}

export function defaultCityIntro(cityName: string, countryName?: string) {
  const where = countryName ? `${ukInLocative(cityName)}, ${countryName}` : ukInLocative(cityName)
  return `Авторські екскурсії українською ${where} від місцевих гідів. Оберіть маршрут, перегляньте ціни та напишіть гіду для підтвердження дати.`
}

export function isBlankHtml(html?: string) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length === 0
}

export function placeFaqOrDefault(custom: FaqItem[] | undefined, fallback: FaqItem[]): FaqItem[] {
  const items = (custom ?? []).filter((item) => item.question.trim() && item.answer.trim())
  return items.length > 0 ? items : fallback
}

export function placeSeoTitle(custom: string | undefined, fallback: string) {
  const t = (custom ?? '').trim()
  return t ? pageTitle(t) : fallback
}

export function placeSeoDescription(custom: string | undefined, fallback: string) {
  return (custom ?? '').trim() || fallback
}

export const DEFAULT_HOME_SEO_TITLE = 'Україномовні гіди та екскурсії за кордоном'
export const DEFAULT_HOME_SEO_DESCRIPTION = 'Каталог приватних гідів і екскурсій українською за кордоном'

export function homeSeoTitle(custom?: string) {
  return placeSeoTitle(custom, pageTitle(DEFAULT_HOME_SEO_TITLE))
}

export function homeSeoDescription(custom?: string, heroSubtitle?: string) {
  return placeSeoDescription(custom, (heroSubtitle ?? '').trim() || DEFAULT_HOME_SEO_DESCRIPTION)
}

export const SEO_GUIDES_LIST_HEADING = 'Україномовні гіди'
export const SEO_GUIDES_LIST_DESCRIPTION = 'Каталог приватних гідів за кордоном — оберіть країну та екскурсію українською'

export function seoGuidesListTitle() {
  return pageTitle(SEO_GUIDES_LIST_HEADING)
}

export function seoGuidesCountryHeading(countryName: string) {
  return `Гіди українською ${ukInLocative(countryName)}`
}

export function seoGuidesCountryTitle(countryName: string) {
  return pageTitle(seoGuidesCountryHeading(countryName))
}

export function seoGuidesCountryDescription(countryName: string, count?: number) {
  if (count && count > 0) {
    return `${count} гідів українською ${ukInLocative(countryName)} — авторські маршрути`
  }
  return `Україномовні гіди ${ukInLocative(countryName)} — авторські маршрути та екскурсії`
}

export function primaryCityName(cityName?: string) {
  return (cityName ?? '').split('·')[0]?.trim() ?? ''
}

export function seoGuideSubtitle(cityName?: string) {
  const city = primaryCityName(cityName)
  if (city) return `Гід українською ${ukInLocative(city)}`
  return 'Гід українською'
}

export function seoGuideHeading(name: string, cityName?: string) {
  const city = primaryCityName(cityName)
  if (city) return `${name} — гід українською ${ukInLocative(city)}`
  return `${name} — гід українською`
}

export function seoGuideTitle(name: string, cityName?: string) {
  return pageTitle(seoGuideHeading(name, cityName))
}

export const SEO_SEARCH_HEADING = 'Пошук екскурсій українською'
export const SEO_SEARCH_DESCRIPTION = 'Знайдіть гіда та екскурсію українською за містом, темою, назвою або датою'

export const SEO_JOURNAL_HEADING = 'Журнал для туристів'
export const SEO_JOURNAL_DESCRIPTION = 'Що подивитись у місті та як знайти перевіреного гіда українською за кордоном'

export const SEO_MAP_HEADING = 'Карта екскурсій українською'
export const SEO_MAP_DESCRIPTION = 'Міста з екскурсіями українською — оберіть напрямок на карті або в списку'

export function seoExcursionTitle(title: string, cityName?: string, price?: number, currency?: string) {
  if (cityName && price != null && currency) {
    return pageTitle(`${title} — екскурсія ${ukInLocative(cityName)}`)
  }
  return pageTitle(title)
}

export type FaqItem = { question: string; answer: string }

export function countryExcursionFaq(countryName: string): FaqItem[] {
  return [
    {
      question: `Як знайти екскурсію українською ${ukInLocative(countryName)}?`,
      answer: `Оберіть екскурсію в каталозі, перегляньте опис і дати, потім напишіть гіду напряму — він підтвердить час і деталі.`,
    },
    {
      question: `Чи можна бронювати українською?`,
      answer: 'Так. Більшість гідів на Gaido проводять екскурсії українською або англійською — мова вказана в описі.',
    },
    {
      question: 'Як оплатити?',
      answer: 'Оплата узгоджується з гідом напряму — платформа допомагає знайти екскурсію та звʼязатися з автором маршруту.',
    },
  ]
}

export function cityExcursionFaq(cityName: string, countryName?: string): FaqItem[] {
  const place = countryName ? `${ukInLocative(cityName)} (${countryName})` : ukInLocative(cityName)
  return [
    {
      question: `Які екскурсії українською є ${place}?`,
      answer: 'У каталозі — групові та індивідуальні екскурсії українською: пішохідні прогулянки, оглядові маршрути та тематичні тури від місцевих гідів.',
    },
    {
      question: 'Як обрати дату?',
      answer: 'На сторінці екскурсії перегляньте календар доступних дат або напишіть гіду — для індивідуальних турів час погоджується окремо.',
    },
    {
      question: 'Чи є відгуки?',
      answer: 'Так. На сторінках гідів і екскурсій — відгуки мандрівників після проведених турів.',
    },
  ]
}

export function buildFaqPageJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Gaido',
    url: '/',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: '/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
