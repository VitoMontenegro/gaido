import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import ExcursionCover from './ExcursionCover'
import FavoriteButton from './FavoriteButton'
import StarRating from './reviews/StarRating'
import type { ExcursionItem } from './excursionUi'
import {
  excursionCoverMetaLine,
  excursionLocationLine,
  excursionPreviewText,
  excursionPriceCaption,
  excursionTypeLabel,
  formatPrice,
  formatReviewCount,
} from './excursionUi'
import { cn } from '@gaido/ui-primitives/cn'

function ExcursionRatingRow({ avg, count, className }: { avg?: number; count?: number; className?: string }) {
  if ((count ?? 0) <= 0) return null
  const value = avg ?? 0

  return (
    <div className={cn('flex shrink-0 items-center gap-1.5 text-xs text-muted', className)}>
      <span>{formatReviewCount(count)}</span>
      <span className="font-semibold tabular-nums text-ink">{value.toFixed(1).replace('.', ',')}</span>
      <StarRating value={value} size="sm" className="gap-px" />
    </div>
  )
}

function ExcursionPreviewDescription({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  return (
    <p className={cn('line-clamp-2 text-sm leading-snug text-muted', className)}>
      {text}
    </p>
  )
}

function LocationPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-3.5 w-3.5 shrink-0', className)} aria-hidden fill="currentColor">
      <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 2.7 3.3 6.8 4.1 7.7a.5.5 0 0 0 .8 0c.8-.9 4.1-5 4.1-7.7A4.5 4.5 0 0 0 8 1.5Zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z" />
    </svg>
  )
}

function CardFavorite({ id }: { id: number }) {
  if (id <= 0) return null
  return (
    <FavoriteButton
      targetType="EXCURSION"
      targetId={id}
      className="absolute right-2 top-2 z-20"
    />
  )
}

function CardShell({
  slug,
  className,
  children,
  id,
}: {
  slug: string
  className: string
  children: ReactNode
  id: number
}) {
  return (
    <div className="relative h-full">
      <Link to={`/excursion/${slug}`} className={className}>
        {children}
      </Link>
      <CardFavorite id={id} />
    </div>
  )
}

export default function ExcursionCard({ e, compact }: { e: ExcursionItem; compact?: boolean }) {
  const previewText = excursionPreviewText(e)
  const location = excursionLocationLine(e)

  if (compact) {
    return (
      <CardShell
        slug={e.slug}
        id={e.id}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <ExcursionCover
          cover={e.cover_image_url}
          title={e.title}
          className="aspect-[4/3]"
          typeLabel={excursionTypeLabel(e.type)}
          metaLine={excursionCoverMetaLine(e.duration_minutes, e.transport_mode)}
        />
        <div className="flex flex-1 flex-col p-2.5 md:p-3">
          <div className="flex items-start justify-between gap-2">
            {location ? (
              <p className="flex min-w-0 items-center gap-1 text-xs text-muted-light">
                <LocationPin className="text-brand-500" />
                <span className="line-clamp-1">{location}</span>
              </p>
            ) : (
              <span />
            )}
            <ExcursionRatingRow avg={e.rating_avg} count={e.rating_count} />
          </div>
          <h3 className="mt-1.5 line-clamp-2 font-semibold normal-case leading-snug text-ink group-hover:text-teal">
            {e.title}
          </h3>
          <ExcursionPreviewDescription text={previewText} className="mt-1.5" />
          <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
            <div>
              <p className="text-sm font-semibold text-ink">{formatPrice(e.price_from, e.currency)}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-light">{excursionPriceCaption(e.type)}</p>
            </div>
          </div>
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell
      slug={e.slug}
      id={e.id}
      className="group card flex h-full flex-col overflow-hidden p-0 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <ExcursionCover
        cover={e.cover_image_url}
        title={e.title}
        className="aspect-[16/10]"
        typeLabel={excursionTypeLabel(e.type)}
        metaLine={excursionCoverMetaLine(e.duration_minutes, e.transport_mode)}
      />
      <div className="flex flex-1 flex-col px-3 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {location && (
              <p className="flex items-center gap-1 text-sm text-muted-light">
                <LocationPin className="text-brand-500" />
                <span className="line-clamp-1">{location}</span>
              </p>
            )}
            <h3 className="mt-1 font-display text-base font-medium uppercase leading-snug text-ink group-hover:text-brand-700">
              {e.title}
            </h3>
          </div>
          <ExcursionRatingRow avg={e.rating_avg} count={e.rating_count} className="pt-0.5" />
        </div>
        <ExcursionPreviewDescription text={previewText} className="mt-2" />
        <hr className="my-3 h-px border-0 bg-divider" />
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
          <div className="text-sm text-muted">
            {excursionTypeLabel(e.type)} · до {e.max_guests} ос.
          </div>
          <p className="font-display text-lg font-medium uppercase text-ink">{formatPrice(e.price_from, e.currency)}</p>
        </div>
        {e.guide_name && (
          <p className="mt-2 text-xs text-muted-light">Гід: {e.guide_name}</p>
        )}
      </div>
    </CardShell>
  )
}

export function ExcursionCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {children}
    </div>
  )
}

export function excursionCardPropsFromPartial(
  item: Partial<ExcursionItem> & Pick<ExcursionItem, 'slug' | 'title'>,
): ExcursionItem {
  return {
    id: item.id ?? 0,
    title: item.title,
    slug: item.slug,
    type: item.type ?? 'INDIVIDUAL',
    duration_minutes: item.duration_minutes,
    transport_mode: item.transport_mode,
    max_guests: item.max_guests ?? 1,
    price_from: item.price_from ?? 0,
    currency: item.currency ?? 'EUR',
    status: item.status ?? 'PUBLISHED',
    description: item.description,
    body_html: item.body_html,
    cover_image_url: item.cover_image_url,
    city_name: item.city_name,
    country_name: item.country_name,
    country_slug: item.country_slug,
    rating_avg: item.rating_avg,
    rating_count: item.rating_count,
  }
}
