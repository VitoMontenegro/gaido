import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sanitizeHtml } from '../lib/html'
import BrandLogo from './BrandLogo'

const SLIDES = [
  { src: '/images/home/excursions.jpg', alt: 'Авторська екскурсія містом' },
  { src: '/images/home/about.jpg', alt: 'Атмосфера подорожі' },
  { src: '/images/home/guides.jpg', alt: 'Місцевий гід' },
] as const

type Props = {
  title: string
  subtitle: string
}

export default function HomeHero({ title, subtitle }: Props) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [motionOk, setMotionOk] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    setMotionOk(true)
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length)
    }, 6500)
    return () => window.clearInterval(id)
  }, [])

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <section className="home-hero relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0" aria-hidden>
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={`home-hero__slide absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding={i === 0 ? 'sync' : 'async'}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/55 to-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-ink/30" />
      </div>

      <div className="container-site relative z-10 flex min-h-[min(78vh,720px)] flex-col justify-center py-14 md:py-20">
        <BrandLogo variant="hero" asLink={false} className="mb-1" />
        <h1 className="mt-3 max-w-3xl font-display text-[28px] font-medium uppercase leading-[1.15] text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p
          className="mt-4 max-w-xl text-base leading-relaxed text-white/80 md:text-lg"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
        />

        <form
          onSubmit={onSearch}
          className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
          role="search"
        >
          <label className="sr-only" htmlFor="home-hero-q">
            Пошук екскурсій
          </label>
          <input
            id="home-hero-q"
            name="q"
            className="input min-h-12 flex-1 border-0 bg-white text-ink shadow-lg placeholder:text-muted-light"
            placeholder="Місто, тема або назва екскурсії"
            autoComplete="off"
          />
          <button type="submit" className="btn-accent min-h-12 shrink-0 px-6 shadow-lg">
            Знайти
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            to="/map"
            className="inline-flex min-h-10 items-center rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Карта напрямків
          </Link>
          <Link to="/guides" className="text-sm font-medium text-white/85 underline-offset-4 hover:underline">
            Дивитись гідів →
          </Link>
        </div>

        {motionOk && (
          <div className="mt-10 flex gap-2" aria-hidden>
            {SLIDES.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-8 badge-teal' : 'w-3 bg-white/35 hover:bg-white/55'
                }`}
                onClick={() => setActive(i)}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
