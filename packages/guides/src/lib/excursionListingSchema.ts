import type { ExcursionItem } from '../components/excursionUi'
import { excursionPreviewText } from '../components/excursionUi'
import { buildExcursionEventJsonLd } from './excursionEventSchema'
import { absoluteUrl, resolveOgImage } from './seo'

type ListingItem = Pick<
  ExcursionItem,
  | 'title'
  | 'slug'
  | 'description'
  | 'body_html'
  | 'cover_image_url'
  | 'price_from'
  | 'currency'
  | 'status'
  | 'rating_avg'
  | 'rating_count'
  | 'city_name'
  | 'country_name'
  | 'guide_name'
  | 'guide_slug'
>

export function buildExcursionItemListJsonLd(items: ListingItem[], listName: string) {
  const published = items.filter((e) => !e.status || e.status === 'PUBLISHED')
  if (published.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: published.length,
    itemListElement: published.slice(0, 50).map((e, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/excursion/${e.slug}`),
      name: e.title,
    })),
  }
}

export function buildExcursionAggregateProductJsonLd(
  items: ListingItem[],
  options: { name: string; description: string },
) {
  const published = items.filter((e) => !e.status || e.status === 'PUBLISHED')
  if (published.length === 0) return null

  const prices = published.map((e) => e.price_from).filter((p) => p > 0)
  const currency = published.find((e) => e.currency)?.currency ?? 'EUR'
  const images = published
    .map((e) => (e.cover_image_url ? resolveOgImage(e.cover_image_url) : undefined))
    .filter(Boolean) as string[]

  const ratings = published.filter((e) => (e.rating_count ?? 0) > 0)
  const totalReviews = ratings.reduce((sum, e) => sum + (e.rating_count ?? 0), 0)
  const weightedRating =
    totalReviews > 0
      ? ratings.reduce((sum, e) => sum + (e.rating_avg ?? 0) * (e.rating_count ?? 0), 0) / totalReviews
      : 0

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: options.name,
    description: options.description,
    ...(images.length > 0 ? { image: images.slice(0, 8) } : {}),
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: prices.length > 0 ? Math.min(...prices) : undefined,
      highPrice: prices.length > 0 ? Math.max(...prices) : undefined,
      priceCurrency: currency,
      offerCount: published.length,
      availability: 'https://schema.org/InStock',
    },
  }

  if (totalReviews > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      worstRating: 1,
      bestRating: 5,
      ratingValue: Number(weightedRating.toFixed(1)),
      reviewCount: totalReviews,
    }
  }

  return product
}

export function buildExcursionListingJsonLd(
  items: ListingItem[],
  options: { name: string; description: string },
) {
  const schemas: Record<string, unknown>[] = []
  const itemList = buildExcursionItemListJsonLd(items, options.name)
  const product = buildExcursionAggregateProductJsonLd(items, options)
  if (itemList) schemas.push(itemList)
  if (product) schemas.push(product)
  return schemas
}

/** Product schema for a single excursion detail page. */
export function buildExcursionProductJsonLd(excursion: ListingItem) {
  if (excursion.status && excursion.status !== 'PUBLISHED') return null

  const url = absoluteUrl(`/excursion/${excursion.slug}`)
  const description = excursion.description?.trim() || excursionPreviewText(excursion)
  const image = excursion.cover_image_url ? resolveOgImage(excursion.cover_image_url) : undefined

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: excursion.title,
    ...(description ? { description } : {}),
    url,
    ...(image ? { image: [image] } : {}),
    offers: {
      '@type': 'Offer',
      price: excursion.price_from,
      priceCurrency: excursion.currency,
      availability: 'https://schema.org/InStock',
      url,
    },
  }

  if (excursion.guide_name) {
    product.brand = {
      '@type': 'Brand',
      name: excursion.guide_name,
    }
  }

  if ((excursion.rating_count ?? 0) > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      worstRating: 1,
      bestRating: 5,
      ratingValue: Number((excursion.rating_avg ?? 0).toFixed(1)),
      reviewCount: excursion.rating_count,
    }
  }

  return product
}

/**
 * Detail page: Product always; Event only for the nearest real scheduled slot.
 * No synthetic/fallback Event dates — avoids schema noise and validator warnings.
 */
export function buildExcursionDetailJsonLd(
  excursion: ListingItem,
  nearestSlot?: { starts_at: string; ends_at: string },
) {
  const schemas: Record<string, unknown>[] = []
  const product = buildExcursionProductJsonLd(excursion)
  if (product) schemas.push(product)

  if (nearestSlot?.starts_at && nearestSlot?.ends_at) {
    const event = buildExcursionEventJsonLd(excursion, {
      startsAt: nearestSlot.starts_at,
      endsAt: nearestSlot.ends_at,
    })
    if (event) schemas.push(event)
  }

  return schemas
}

export function buildArticleJsonLd(article: {
  title: string
  slug: string
  excerpt?: string
  cover_image_url?: string
  published_at?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? article.title,
    url: absoluteUrl(`/journal/${article.slug}`),
    ...(article.cover_image_url ? { image: resolveOgImage(article.cover_image_url) } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Gaido',
    },
  }
}

export function buildPersonJsonLd(guide: {
  display_name: string
  slug: string
  about?: string
  avatar_url?: string
  rating_avg?: number
  rating_count?: number
}) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: guide.display_name,
    description: guide.about,
    url: absoluteUrl(`/guide/${guide.slug}`),
  }
  if (guide.avatar_url) {
    schema.image = resolveOgImage(guide.avatar_url)
  }
  if ((guide.rating_count ?? 0) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      worstRating: 1,
      bestRating: 5,
      ratingValue: guide.rating_avg ?? 0,
      reviewCount: guide.rating_count,
    }
  }
  return schema
}

export function buildPlaceJsonLd(options: { name: string; path: string; countryName?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: options.name,
    url: absoluteUrl(options.path),
    ...(options.countryName
      ? {
          containedInPlace: {
            '@type': 'Country',
            name: options.countryName,
          },
        }
      : {}),
  }
}
