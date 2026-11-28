import type { Review } from '@gaido/api-client/api/types/reviews'
import { absoluteUrl } from './seo'

export function reviewsSchema(reviews: Review[], path: string) {
  const eligible = reviews.filter(r => r.excursion_slug && r.excursion_title && r.rating >= 1 && r.rating <= 5)
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Відгуки мандрівників', url: absoluteUrl(path),
    mainEntity: { '@type': 'ItemList', numberOfItems: eligible.length,
      itemListElement: eligible.map((r, index) => ({
        '@type': 'ListItem', position: index + 1, item: {
          '@type': 'Review', author: { '@type': 'Person', name: r.author_name?.trim() || 'Мандрівник' },
          itemReviewed: { '@type': 'Product', name: r.excursion_title, url: absoluteUrl(`/excursion/${r.excursion_slug}`) },
          reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          ...(r.text?.trim() ? { reviewBody: r.text.trim() } : {}),
          ...(r.created_at ? { datePublished: r.created_at } : {}),
        },
      })),
    },
  }
}
