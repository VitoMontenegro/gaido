import { resolveMediaUrl } from '../api/client'
import { cn } from '../lib/cn'

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
}

export default function ExcursionCover({ cover, title, className, imgClassName }: ExcursionCoverProps) {
  return (
    <div className={cn('relative overflow-hidden bg-sand-100', className)}>
      <img
        src={excursionCoverSrc(cover)}
        alt={title ? `Обкладинка: ${title}` : ''}
        className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)}
        loading="lazy"
      />
    </div>
  )
}
