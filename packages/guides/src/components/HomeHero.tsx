import { type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { sanitizeHtml } from '../lib/html'

const HERO_IMAGE = staticAssetUrl('/images/home/about.jpg')

type Props = {
  heading: string
  eyebrow?: string
  subtitle: string
}

export default function HomeHero({ heading, eyebrow, subtitle }: Props) {
  const navigate = useNavigate()

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <section className="home-hero-v2 relative isolate overflow-hidden bg-sand-100">
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="sync"
      />
      <div
        className="absolute inset-0 bg-linear-to-b from-white/55 via-white/35 to-white/95"
        aria-hidden
      />

      <div className="container-site relative z-10 flex min-h-[min(52vh,520px)] flex-col justify-end pb-10 pt-28 md:min-h-[min(58vh,560px)] md:pb-14 md:pt-32">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium text-muted md:text-base">{eyebrow}</p>
        ) : null}
        <h1 className="max-w-3xl font-display text-[32px] font-semibold leading-tight text-ink sm:text-4xl md:text-[44px]">
          {heading}
        </h1>
        <p
          className="mt-3 max-w-2xl text-base leading-relaxed text-muted md:text-lg"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
        />

        <form onSubmit={onSearch} className="home-hero-v2__search mt-8 w-full max-w-3xl" role="search">
          <label className="sr-only" htmlFor="home-hero-q">
            Пошук країни, міста або екскурсії
          </label>
          <MagnifyingGlassIcon className="home-hero-v2__search-icon" aria-hidden />
          <input
            id="home-hero-q"
            name="q"
            className="home-hero-v2__search-input"
            placeholder="Знайти країну, місто або екскурсію"
            autoComplete="off"
          />
          <button type="submit" className="home-hero-v2__search-btn" aria-label="Шукати">
            <MagnifyingGlassIcon className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  )
}
