import { useEffect, useState } from 'react'
import { resolveMediaUrl } from '../api/client'
import { cn } from '../lib/cn'
import { EXCURSION_DEFAULT_COVER } from './ExcursionCover'

type Props = {
  images: string[]
  mobileCover?: string
  title: string
}

const TILE_ROUND = 'rounded-2xl md:rounded-3xl'

function GalleryImage({
  src,
  alt,
  className,
  fallbackSrc,
}: {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
}) {
  const [current, setCurrent] = useState(src)

  useEffect(() => {
    setCurrent(src)
  }, [src])

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc)
      }}
    />
  )
}

function HeroTile({
  src,
  index,
  alt,
  fallback,
  className,
  wrapperClassName,
  overlayCount,
  badge,
  openAtIndex,
  onOpen,
}: {
  src: string
  index: number
  alt: string
  fallback: string
  className?: string
  wrapperClassName?: string
  overlayCount?: number
  badge?: string
  openAtIndex?: number
  onOpen: (index: number) => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'group relative min-w-0 overflow-hidden bg-[rgba(15,26,40,0.1)] transition-opacity hover:opacity-95 active:opacity-90',
        TILE_ROUND,
        className,
      )}
      onClick={() => onOpen(openAtIndex ?? index)}
    >
      <div className={cn('relative min-h-0', wrapperClassName)}>
        <GalleryImage
          src={src}
          fallbackSrc={fallback}
          alt={alt}
          className={cn(
            'h-full w-full object-cover',
            overlayCount != null && 'absolute inset-0',
          )}
        />
        {overlayCount != null && (
          <>
            <span className="absolute inset-0 bg-[rgba(15,26,40,0.6)]" aria-hidden />
            <span className="absolute inset-0 z-10 flex items-center justify-center">
              <span className="flex flex-col items-center justify-center gap-1">
                <span className="text-lg font-bold text-white">{overlayCount} фото</span>
                <span className="text-sm text-white/80">Усі фото →</span>
              </span>
            </span>
          </>
        )}
      </div>
      {badge && overlayCount == null && (
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-base text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function MobileHero({
  urls,
  mobileCover,
  title,
  fallback,
  onOpen,
}: {
  urls: string[]
  mobileCover?: string
  title: string
  fallback: string
  onOpen: (index: number) => void
}) {
  const n = urls.length
  const coverSrc = mobileCover ? resolveMediaUrl(mobileCover) : urls[0]
  const [active, setActive] = useState(0)
  const mainSrc = active === 0 && mobileCover ? coverSrc : urls[active]

  if (n <= 1) {
    return (
      <button
        type="button"
        className={cn('relative block w-full overflow-hidden md:hidden', TILE_ROUND)}
        onClick={() => onOpen(0)}
      >
        <GalleryImage
          src={coverSrc}
          fallbackSrc={fallback}
          alt={title}
          className="aspect-384/266 w-full object-cover"
        />
      </button>
    )
  }

  const overlayBgIndex = n > 5 ? 5 : n - 1
  const thumbCols = n > 4 ? 'grid-cols-4' : n === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className="space-y-2 md:hidden">
      <button
        type="button"
        className={cn('relative block w-full overflow-hidden', TILE_ROUND)}
        onClick={() => onOpen(active)}
      >
        <GalleryImage
          src={mainSrc}
          fallbackSrc={fallback}
          alt={title}
          className="aspect-384/266 w-full object-cover"
        />
      </button>
      <div className={cn('grid items-center gap-2', thumbCols)}>
        {urls.slice(0, n > 4 ? 3 : n).map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Фото ${i + 1}`}
            className={cn(
              'aspect-9/8 min-w-0 overflow-hidden rounded-2xl transition ring-2 ring-transparent',
              active === i && 'ring-brand-500',
            )}
            onClick={() => setActive(i)}
          >
            <GalleryImage src={src} fallbackSrc={fallback} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {n > 4 ? (
          <button
            type="button"
            className="relative aspect-9/8 min-w-0 overflow-hidden rounded-xl"
            onClick={() => onOpen(0)}
          >
            <GalleryImage
              src={urls[overlayBgIndex]}
              fallbackSrc={fallback}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-[rgba(15,26,40,0.6)]" aria-hidden />
            <span className="relative flex h-full flex-col items-center justify-center gap-0.5">
              <span className="text-sm font-semibold leading-tight text-white">{n} фото</span>
              <span className="text-xs leading-tight text-white/80">Усі фото →</span>
            </span>
          </button>
        ) : (
          n === 4 && (
            <button
              type="button"
              aria-label="Фото 4"
              className={cn(
                'aspect-9/8 min-w-0 overflow-hidden rounded-2xl transition ring-2 ring-transparent',
                active === 3 && 'ring-brand-500',
              )}
              onClick={() => setActive(3)}
            >
              <GalleryImage src={urls[3]} fallbackSrc={fallback} alt="" className="h-full w-full object-cover" />
            </button>
          )
        )}
      </div>
    </div>
  )
}

/** Parus desktop: верхній ряд 1fr+2fr, нижній ряд 1fr+1.4fr (з 5 фото). */
function ParusDesktopLayout({
  urls,
  title,
  fallback,
  onOpen,
}: {
  urls: string[]
  title: string
  fallback: string
  onOpen: (index: number) => void
}) {
  const n = urls.length
  const showBottomRow = n >= 5

  return (
    <div className="hidden min-w-0 sm:block">
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
        <div className="flex min-w-0 flex-row gap-3 md:flex-col">
          <HeroTile
            src={urls[1]}
            index={1}
            alt=""
            fallback={fallback}
            wrapperClassName="excursion-parus-hero__thumb w-full"
            onOpen={onOpen}
          />
          {n > 5 ? (
            <HeroTile
              src={urls[5]}
              index={5}
              alt=""
              fallback={fallback}
              wrapperClassName="excursion-parus-hero__thumb relative w-full"
              overlayCount={n}
              openAtIndex={5}
              onOpen={onOpen}
            />
          ) : (
            <HeroTile
              src={urls[2]}
              index={2}
              alt=""
              fallback={fallback}
              wrapperClassName="excursion-parus-hero__thumb w-full"
              badge={n === 3 ? 'Усі фото →' : undefined}
              onOpen={onOpen}
            />
          )}
        </div>
        <HeroTile
          src={urls[0]}
          index={0}
          alt={title}
          fallback={fallback}
          className="min-h-0"
          wrapperClassName="excursion-parus-hero__main w-full object-cover h-full"
          onOpen={onOpen}
        />
      </div>

      {showBottomRow && (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:mt-3 md:grid-cols-[1fr_1.4fr]">
          <HeroTile
            src={urls[3]}
            index={3}
            alt=""
            fallback={fallback}
            wrapperClassName="excursion-parus-hero__bottom-left w-full"
            onOpen={onOpen}
          />
          <HeroTile
            src={urls[4]}
            index={4}
            alt=""
            fallback={fallback}
            wrapperClassName="excursion-parus-hero__bottom-right w-full"
            onOpen={onOpen}
          />
        </div>
      )}
    </div>
  )
}

function DesktopGallery({
  urls,
  title,
  fallback,
  onOpen,
}: {
  urls: string[]
  title: string
  fallback: string
  onOpen: (index: number) => void
}) {
  const n = urls.length

  if (n === 2) {
    return (
      <div className="excursion-parus-hero__grid excursion-parus-hero__grid--2 hidden gap-3 sm:grid">
        <HeroTile
          src={urls[0]}
          index={0}
          alt={title}
          fallback={fallback}
          wrapperClassName="excursion-parus-hero__half h-full"
          className="min-h-0"
          onOpen={onOpen}
        />
        <HeroTile
          src={urls[1]}
          index={1}
          alt=""
          fallback={fallback}
          wrapperClassName="excursion-parus-hero__half h-full"
          className="min-h-0"
          onOpen={onOpen}
        />
      </div>
    )
  }

  if (n === 4) {
    return (
      <div className="excursion-parus-hero__grid excursion-parus-hero__grid--4 hidden gap-3 sm:grid">
        {urls.slice(0, 4).map((src, i) => (
          <HeroTile
            key={src}
            src={src}
            index={i}
            alt={i === 0 ? title : ''}
            fallback={fallback}
            wrapperClassName="excursion-parus-hero__quad aspect-video"
            className="min-h-0"
            onOpen={onOpen}
          />
        ))}
      </div>
    )
  }

  if (n === 3 || n >= 5) {
    return <ParusDesktopLayout urls={urls} title={title} fallback={fallback} onOpen={onOpen} />
  }

  return null
}

export default function ExcursionHeroGallery({ images, mobileCover, title }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const urls = images.map(resolveMediaUrl).filter(Boolean)

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

  const fallback = EXCURSION_DEFAULT_COVER
  const openLightbox = (index: number) => setLightbox(index)

  return (
    <>
      <section className="excursion-parus-hero">
        {urls.length === 1 ? (
          <button
            type="button"
            className={cn('relative block w-full overflow-hidden', TILE_ROUND)}
            onClick={() => openLightbox(0)}
          >
            <GalleryImage
              src={urls[0]}
              fallbackSrc={fallback}
              alt={title}
              className="aspect-606/404 w-full object-cover md:aspect-606/404"
            />
          </button>
        ) : (
          <>
            <MobileHero
              urls={urls}
              mobileCover={mobileCover}
              title={title}
              fallback={fallback}
              onOpen={openLightbox}
            />
            <DesktopGallery urls={urls} title={title} fallback={fallback} onOpen={openLightbox} />
          </>
        )}
      </section>

      {lightbox !== null && (
        <Lightbox
          urls={urls}
          index={lightbox}
          fallback={fallback}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
      )}
    </>
  )
}

function Lightbox({
  urls,
  index,
  fallback,
  onClose,
  onChange,
}: {
  urls: string[]
  index: number
  fallback: string
  onClose: () => void
  onChange: (i: number) => void
}) {
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
          onClick={(e) => {
            e.stopPropagation()
            onChange(index - 1)
          }}
        >
          ←
        </button>
      )}
      <GalleryImage
        src={urls[index]}
        fallbackSrc={fallback}
        alt=""
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
      />
      {index < urls.length - 1 && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
          onClick={(e) => {
            e.stopPropagation()
            onChange(index + 1)
          }}
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
