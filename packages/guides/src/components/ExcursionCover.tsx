import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { cn } from '@gaido/ui-primitives/cn'

export const EXCURSION_DEFAULT_COVER = '/images/home/excursions.jpg'

export function excursionCoverSrc(cover?: string | null) {
  const url = cover?.trim()
  if (!url) return EXCURSION_DEFAULT_COVER
  return resolveMediaUrl(url) || EXCURSION_DEFAULT_COVER
}

type ExcursionCoverProps = {
  cover?: string | null
  title?: string
  className?: string
  imgClassName?: string
  typeLabel?: string
  metaLine?: string
}

export default function ExcursionCover({ cover, title, className, imgClassName, typeLabel, metaLine }: ExcursionCoverProps) {
  const showOverlay = Boolean(typeLabel || metaLine)

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
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-2/5 bg-linear-to-b from-black/55 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-linear-to-t from-black/55 to-transparent"
            aria-hidden
          />
          {typeLabel && (
            <span className="absolute left-2.5 top-2.5 z-10 text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
              {typeLabel}
            </span>
          )}
          {metaLine && (
            <span className="absolute bottom-2.5 right-2.5 z-10 rounded-full bg-ink/55 px-2.5 py-1 text-xs text-white backdrop-blur-[2px]">
              {metaLine}
            </span>
          )}
        </>
      )}
    </div>
  )
}
