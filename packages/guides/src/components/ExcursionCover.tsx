import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { cn } from '@gaido/ui-primitives/cn'
import { formatReviewCount } from './excursionUi'

export const EXCURSION_DEFAULT_COVER = staticAssetUrl('/images/home/excursions.jpg')

export function excursionCoverSrc(cover?: string | null) {
  const url = cover?.trim()
  if (!url) return EXCURSION_DEFAULT_COVER
  return resolveMediaUrl(url) || EXCURSION_DEFAULT_COVER
}

function CoverRatingBadge({ avg, count }: { avg?: number; count?: number }) {
  if ((count ?? 0) <= 0) return null
  const value = (avg ?? 0).toFixed(1).replace('.', ',')

  return (
    <span
      className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-xl bg-black/45 px-2 h-6  text-[13px] font-semibold tabular-nums leading-none text-white backdrop-blur-[2px]"
      aria-label={`Оцінка ${value}, ${formatReviewCount(count)}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#ffe72f]" aria-hidden fill="currentColor">
        <path d="M12 1.6 14.9 8l6.9 1-5 4.8 1.2 6.9L12 17.4 6 20.7l1.2-6.9-5-4.8 6.9-1L12 1.6Z" />
      </svg>
      {value}
    </span>
  )
}

type ExcursionCoverProps = {
  cover?: string | null
  title?: string
  className?: string
  imgClassName?: string
  typeLabel?: string
  metaLine?: string
  ratingAvg?: number
  ratingCount?: number
}

export default function ExcursionCover({
  cover,
  title,
  className,
  imgClassName,
  typeLabel,
  metaLine,
  ratingAvg,
  ratingCount,
}: ExcursionCoverProps) {
  const hasRating = (ratingCount ?? 0) > 0
  const showOverlay = Boolean(typeLabel || metaLine || hasRating)

  return (
    <div className={cn('relative overflow-hidden bg-sand-100', className)}>
      <img
        src={excursionCoverSrc(cover)}
        alt={title ? `Обкладинка: ${title}` : ''}
        className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)}
        loading="lazy"
      />
      {showOverlay && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-1 h-2/5 bg-linear-to-b from-black/55 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-2/5 bg-linear-to-t from-black/55 to-transparent"
            aria-hidden
          />
          {typeLabel && (
            <span className="absolute left-2.5 top-2.5 z-10 text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
              {typeLabel}
            </span>
          )}
          {metaLine && (
            <span
              className={cn(
                'absolute bottom-2.5 left-2.5 z-10 truncate rounded-full bg-white/90 px-2 py-0.5 text-[11px] leading-tight text-ink sm:px-2.5 sm:py-1 sm:text-xs',
                hasRating ? 'max-w-[calc(100%-3.75rem)]' : 'max-w-[calc(100%-1.25rem)]',
              )}
            >
              {metaLine}
            </span>
          )}
          <CoverRatingBadge avg={ratingAvg} count={ratingCount} />
        </>
      )}
    </div>
  )
}
