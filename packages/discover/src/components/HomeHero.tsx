import { useEffect, useState, type ReactNode } from 'react'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'

const SLIDES = [
  { src: staticAssetUrl('/images/home/about.webp'), alt: 'Послуги поруч' },
  { src: staticAssetUrl('/images/home/map.jpg'), alt: 'Міста і локації' },
  { src: staticAssetUrl('/images/home/search.jpg'), alt: 'Пошук послуг' },
] as const

export default function HomeHero({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="home-hero relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0" aria-hidden>
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={i === 0 ? slide.alt : ''}
            className={`home-hero__slide absolute inset-0 h-full w-full object-cover transition-opacity duration-1400 ease-out ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding={i === 0 ? 'sync' : 'async'}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/60 to-ink/30" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-ink/30" />
      </div>

      <div className="container-site relative z-10 flex min-h-[min(78vh,720px)] flex-col justify-center pb-14 pt-32 md:pb-20 md:pt-36">
        <h1 className="max-w-3xl font-display text-[28px] font-medium uppercase leading-[1.15] text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">{subtitle}</p>
        {children && (
          <div className="mt-8 w-full max-w-3xl rounded-2xl bg-white/95 p-4 text-ink shadow-xl backdrop-blur md:p-5">
            {children}
          </div>
        )}
      </div>
    </section>
  )
}
