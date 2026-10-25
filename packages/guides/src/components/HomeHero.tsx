import { type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { sanitizeHtml } from '../lib/html'

const HERO_IMAGE = staticAssetUrl('/images/home/hero-svit.jpg')

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
    <section className="home-hero-v2 relative isolate overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
        decoding="sync"
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-sky-100/45 via-sky-50/15 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/35 to-transparent"
        aria-hidden
      />

      <div className="home-hero-v2__copy container-site relative z-10 flex flex-col justify-center pb-10 pt-24 md:pb-12 md:pt-28">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium text-white md:text-base">{eyebrow}</p>
        ) : null}
        <h1 className="max-w-3xl font-display text-[28px] font-medium uppercase leading-[1.15] text-white sm:text-4xl">
          {heading}
        </h1>
        {subtitle.trim() ? (
          <p
            className="mt-3 max-w-2xl text-base leading-relaxed text-white md:text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
          />
        ) : null}

        <form onSubmit={onSearch} className="home-hero-v2__search mt-6 w-full max-w-xl md:mt-8 md:max-w-2xl" role="search">
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
