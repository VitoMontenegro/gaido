import { useState } from 'react'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { openImageGallery } from '../lib/fancybox'

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
  const hasMore = urls.length > 6
  const hideMoreOnDesktop = urls.length <= 8

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
            onClick={() => openImageGallery(urls, i)}
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
    </section>
  )
}
