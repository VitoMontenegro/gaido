import { pageTitle } from '@gaido/site-urls/brand'
import type { FaqItem } from './popularRoutes'

export function seoRouteTitle(fromName: string, toName: string) {
  return pageTitle(`Рейси ${fromName} → ${toName}`)
}

export function seoRouteDescription(fromName: string, toName: string, count?: number) {
  if (count && count > 0) {
    return `${count} рейсів ${fromName} → ${toName}: маршрутки, попутки, ціни та бронювання для українців`
  }
  return `Міжнародні рейси ${fromName} → ${toName} — маршрутки та попутки для українців за кордоном`
}

export function seoCityHubTitle(cityName: string) {
  return pageTitle(`Рейси з ${cityName} та до ${cityName}`)
}

export function seoCityHubDescription(cityName: string, count?: number) {
  if (count && count > 0) {
    return `${count} рейсів через ${cityName} — регулярні маршрутки та попутки для українців`
  }
  return `Міжнародні рейси з ${cityName} та до ${cityName} — бронювання на Vezu`
}

export function seoCarriersTitle() {
  return pageTitle('Перевізники')
}

export function seoCarriersDescription(count?: number) {
  if (count && count > 0) {
    return `${count} перевізників на Vezu — компанії, ФОП та приватні водії з верифікацією`
  }
  return 'Каталог перевізників Vezu — компанії, ФОП та приватні водії'
}

export function buildFaqPageJsonLd(items: readonly FaqItem[] | FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Gaido Vezu',
    url: '/',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: '/search?from_city_id={from}&to_city_id={to}',
      },
    },
  }
}
