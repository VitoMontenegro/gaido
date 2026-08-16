import { Link } from 'react-router-dom'
import ExcursionCover from './ExcursionCover'
import type { ExcursionItem } from './excursionUi'
import { excursionCoverMetaLine, excursionPreviewText, excursionTypeLabel, formatExcursionRating, formatPrice } from './excursionUi'
import { cn } from '@gaido/ui-primitives/cn'

function ExcursionRating({ avg, count, className }: { avg?: number; count?: number; className?: string }) {
  if ((count ?? 0) <= 0) return null

  return (
    <p className={cn('text-xs text-blue-500', className)}>
      {formatExcursionRating(avg, count)}
    </p>
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

export default function ExcursionCard({ e, compact }: { e: ExcursionItem; compact?: boolean }) {
  const previewText = excursionPreviewText(e)

  if (compact) {
    return (
      <Link
        to={`/excursion/${e.slug}`}
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
          {e.city_name && (
            <p className="line-clamp-1 text-xs text-muted-light">{e.city_name}</p>
          )}
          <p className="mt-0.5 line-clamp-2 font-semibold normal-case leading-snug text-ink group-hover:text-blue-600">
            {e.title}
          </p>
          <ExcursionPreviewDescription text={previewText} className="mt-1.5" />
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p className="text-sm font-semibold text-ink">{formatPrice(e.price_from, e.currency)}</p>
            <ExcursionRating avg={e.rating_avg} count={e.rating_count} />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/excursion/${e.slug}`}
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
            {e.city_name && (
              <p className="text-sm text-muted-light">{e.city_name}</p>
            )}
            <h3 className="mt-1 font-display text-base font-medium uppercase leading-snug text-ink group-hover:text-brand-700">
              {e.title}
            </h3>
          </div>
          <ExcursionRating avg={e.rating_avg} count={e.rating_count} className="shrink-0 pt-1" />
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
    </Link>
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
    rating_avg: item.rating_avg,
    rating_count: item.rating_count,
  }
}
