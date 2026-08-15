import { useEffect } from 'react'
import { EXCURSION_DEFAULT_COVER } from '../ExcursionCover'

type Props = {
  urls: string[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

export default function ImageLightbox({ urls, index, onClose, onChange }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onChange(Math.min(index + 1, urls.length - 1))
      if (e.key === 'ArrowLeft') onChange(Math.max(index - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, urls.length, onClose, onChange])

  if (urls.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Галерея"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
        onClick={onClose}
      >
        Закрити
      </button>
      {index > 0 && (
        <button
          type="button"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
          onClick={(e) => { e.stopPropagation(); onChange(index - 1) }}
        >
          ←
        </button>
      )}
      <img
        src={urls[index]}
        alt=""
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onError={(e) => { e.currentTarget.src = EXCURSION_DEFAULT_COVER }}
        onClick={(e) => e.stopPropagation()}
      />
      {index < urls.length - 1 && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
          onClick={(e) => { e.stopPropagation(); onChange(index + 1) }}
        >
          →
        </button>
      )}
      <p className="absolute bottom-4 text-base text-white/80">
        {index + 1} / {urls.length}
      </p>
    </div>
  )
}
