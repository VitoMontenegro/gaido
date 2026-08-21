import { resolveMediaUrl } from '@gaido/api-client/api/http'
import { SITE_NAME } from '@gaido/site-urls/brand'
import type { ExcursionItem } from '../components/excursionUi'
import { excursionPreviewText } from '../components/excursionUi'
import { absoluteUrl } from './seo'

const COUNTRY_SLUG_TO_ISO: Record<string, string> = {
  russia: 'RU',
  turkey: 'TR',
  italy: 'IT',
  georgia: 'GE',
  spain: 'ES',
  'united-kingdom': 'GB',
  'united-states': 'US',
  uae: 'AE',
  'south-korea': 'KR',
  'north-korea': 'KP',
  czechia: 'CZ',
}

const LANGUAGE_REGION: Record<string, string> = {
  uk: 'UA',
  en: 'US',
  ru: 'RU',
  tr: 'TR',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  pl: 'PL',
}

type ExcursionEventSource = Pick<
  ExcursionItem,
  | 'title'
  | 'slug'
  | 'description'
  | 'body_html'
  | 'cover_image_url'
  | 'price_from'
  | 'currency'
  | 'status'
  | 'duration_minutes'
  | 'language'
  | 'meeting_point'
  | 'city_name'
  | 'country_name'
  | 'country_slug'
  | 'guide_name'
  | 'guide_slug'
  | 'rating_avg'
  | 'rating_count'
>

export type ExcursionEventSchemaOptions = {
  dateFilter?: string
  startsAt?: string
  endsAt?: string
}

function countryIsoFromSlug(slug?: string) {
  if (!slug) return undefined
  const mapped = COUNTRY_SLUG_TO_ISO[slug.toLowerCase()]
  if (mapped) return mapped
  if (slug.length === 2) return slug.toUpperCase()
  return undefined
}

function schemaLanguage(code?: string) {
  const lang = (code || 'uk').toLowerCase()
  const region = LANGUAGE_REGION[lang] || lang.toUpperCase()
  return `${lang}-${region}`
}

function eventDates(excursion: ExcursionEventSource, options?: ExcursionEventSchemaOptions) {
  if (options?.startsAt && options?.endsAt) {
    return { startDate: options.startsAt, endDate: options.endsAt }
  }

  const durationMs = Math.max(excursion.duration_minutes || 180, 60) * 60 * 1000
  let start: Date

  if (options?.dateFilter) {
    start = new Date(`${options.dateFilter}T10:00:00`)
  } else {
    start = new Date()
    start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(10, 0, 0, 0)
  }

  return {
    startDate: start.toISOString(),
    endDate: new Date(start.getTime() + durationMs).toISOString(),
  }
}

export function buildExcursionEventJsonLd(
  excursion: ExcursionEventSource,
  options?: ExcursionEventSchemaOptions,
): Record<string, unknown> | null {
  if (excursion.status && excursion.status !== 'PUBLISHED') return null

  const url = absoluteUrl(`/excursion/${excursion.slug}`)
  const imageSrc = excursion.cover_image_url ? resolveMediaUrl(excursion.cover_image_url) : undefined
  const image = imageSrc ? absoluteUrl(imageSrc) : undefined
  const { startDate, endDate } = eventDates(excursion, options)
  const locality = excursion.city_name || excursion.country_name || ''
  const countryCode = countryIsoFromSlug(excursion.country_slug)
  const description = excursionPreviewText(excursion)

  const address: Record<string, unknown> = { '@type': 'PostalAddress' }
  if (excursion.meeting_point?.trim()) address.streetAddress = excursion.meeting_point.trim()
  if (locality) address.addressLocality = locality
  if (countryCode) address.addressCountry = countryCode

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: locality || excursion.country_name || 'Україна',
  }
  if (Object.keys(address).length > 1) location.address = address

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: excursion.title,
    ...(description ? { description } : {}),
    startDate,
    endDate,
    url,
    ...(image ? { image: [image] } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    inLanguage: schemaLanguage(excursion.language),
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
    performer: excursion.guide_name
      ? {
          '@type': 'Person',
          name: excursion.guide_name,
          ...(excursion.guide_slug ? { url: absoluteUrl(`/guide/${excursion.guide_slug}`) } : {}),
        }
      : {
          '@type': 'PerformingGroup',
          name: 'Гід-екскурсовод',
        },
    location,
    offers: {
      '@type': 'Offer',
      price: excursion.price_from,
      priceCurrency: excursion.currency,
      availability: 'https://schema.org/InStock',
      validFrom: startDate,
      url,
    },
    ...((excursion.rating_count ?? 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            worstRating: 1,
            bestRating: 5,
            ratingValue: excursion.rating_avg ?? 0,
            reviewCount: excursion.rating_count,
          },
        }
      : {}),
  }
}

export function buildExcursionEventsJsonLd(
  items: ExcursionEventSource[],
  options?: ExcursionEventSchemaOptions & { limit?: number },
) {
  const limit = options?.limit ?? 50
  return items
    .slice(0, limit)
    .map((item) => buildExcursionEventJsonLd(item, options))
    .filter((item): item is Record<string, unknown> => item !== null)
}
