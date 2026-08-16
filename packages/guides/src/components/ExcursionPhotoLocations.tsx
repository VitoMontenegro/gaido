import { useEffect, useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { EXCURSION_DEFAULT_COVER } from './ExcursionCover'

type Props = {
  images: string[]
  title?: string
}

function visibleClass(index: number): string {
  if (index < 6) return ''
  if (index < 8) return 'excursion-parus-photos__item--desktop-only'
  return 'excursion-parus-photos__item--hidden'
}

export default function ExcursionPhotoLocations({
  images,
  title = 'Фотографії з екскурсії',
}: Props) {
  const keys = images.filter(Boolean)
  const urls = keys.map(resolveMediaUrl).filter(Boolean)
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const hasMore = urls.length > 6
  const hideMoreOnDesktop = urls.length <= 8

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : Math.min(i + 1, urls.length - 1)))
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : Math.max(i - 1, 0)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, urls.length])

  if (urls.length === 0) return null

  return (
    <section className="excursion-parus-section shadow-lg p-4">
      <h2 className="excursion-parus-section__title">{title}</h2>

      <div
        className={`excursion-parus-photos${expanded ? ' excursion-parus-photos--expanded' : ''}`}
        id="excursion-photo-locations"
      >
        {urls.map((src, i) => (
          <button
            key={keys[i] ?? src}
            type="button"
            className={`excursion-parus-photos__item ${visibleClass(i)}`.trim()}
            onClick={() => setLightbox(i)}
          >
            <img src={src} alt="" loading={i < 6 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>

      {hasMore && (
        <div
          className={`excursion-parus-photos__actions${hideMoreOnDesktop ? ' excursion-parus-photos__actions--mobile-only' : ''}`}
        >
          <button
            type="button"
            className="excursion-parus-photos__more"
            aria-expanded={expanded}
            aria-controls="excursion-photo-locations"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Згорнути' : 'Дивитися ще'}
          </button>
        </div>
      )}

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Галерея"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            Закрити
          </button>
          {lightbox > 0 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
            >
              ←
            </button>
          )}
          <img
            src={urls[lightbox]}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onError={(e) => { e.currentTarget.src = EXCURSION_DEFAULT_COVER }}
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox < urls.length - 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
            >
              →
            </button>
          )}
          <p className="absolute bottom-4 text-base text-white/80">
            {lightbox + 1} / {urls.length}
          </p>
        </div>
      )}
    </section>
  )
}
