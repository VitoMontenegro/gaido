import { pageTitle } from '@gaido/site-urls/brand'

export function seoCountryExcursionsTitle(countryName: string) {
  return pageTitle(`Екскурсії в ${countryName}`)
}

export function seoCountryExcursionsDescription(countryName: string, count?: number) {
  if (count && count > 0) {
    return `${count} екскурсій у ${countryName} — ціни, гіди, авторські маршрути для українців`
  }
  return `Екскурсії в ${countryName} — ціни, гіди, авторські маршрути для українців`
}

export function seoCityExcursionsTitle(cityName: string) {
  return pageTitle(`Екскурсії в ${cityName}`)
}

export function seoCityExcursionsDescription(cityName: string, countryName?: string) {
  const place = countryName ? `${cityName}, ${countryName}` : cityName
  return `Гіди та авторські екскурсії в ${place} — бронювання напряму з гідом`
}

export function defaultCountryIntro(countryName: string) {
  return `Оберіть авторську екскурсію в ${countryName} від місцевих гідів українською або англійською. Порівняйте ціни, перегляньте маршрути та напишіть гіду напряму для бронювання дати.`
}

export function defaultCityIntro(cityName: string, countryName?: string) {
  const place = countryName ? `${cityName}, ${countryName}` : cityName
  return `Авторські тури в ${place} від місцевих гідів. Оберіть маршрут, перегляньте ціни та напишіть гіду для підтвердження дати.`
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

export const DEFAULT_HOME_SEO_TITLE = 'Гіди та екскурсії'

export function homeSeoTitle(custom?: string) {
  return placeSeoTitle(custom, pageTitle(DEFAULT_HOME_SEO_TITLE))
}

export function homeSeoDescription(custom?: string, heroSubtitle?: string) {
  return placeSeoDescription(custom, (heroSubtitle ?? '').trim() || 'Гіди та екскурсії для українців за кордоном')
}

export function seoGuidesCountryTitle(countryName: string) {
  return pageTitle(`Гіди в ${countryName}`)
}

export function seoGuidesCountryDescription(countryName: string, count?: number) {
  if (count && count > 0) {
    return `${count} гідів у ${countryName} — авторські маршрути українською`
  }
  return `Місцеві гіди в ${countryName} — авторські маршрути українською`
}

export function seoExcursionTitle(title: string, cityName?: string, price?: number, currency?: string) {
  if (cityName && price != null && currency) {
    return pageTitle(`${title} — екскурсія в ${cityName}`)
  }
  return pageTitle(title)
}

export type FaqItem = { question: string; answer: string }

export function countryExcursionFaq(countryName: string): FaqItem[] {
  return [
    {
      question: `Як знайти екскурсію в ${countryName}?`,
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
  const place = countryName ? `${cityName} (${countryName})` : cityName
  return [
    {
      question: `Які екскурсії є в ${place}?`,
      answer: 'У каталозі — групові та індивідуальні тури: пішохідні прогулянки, оглядові маршрути та тематичні екскурсії від місцевих гідів.',
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
