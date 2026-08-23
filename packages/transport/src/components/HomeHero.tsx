import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import CityPicker from './CityPicker'

const SLIDES = [
  { src: staticAssetUrl('/images/home/excursions.jpg'), alt: 'Міжнародні рейси' },
  { src: staticAssetUrl('/images/home/about.jpg'), alt: 'Подорож за кордон' },
  { src: staticAssetUrl('/images/home/search.jpg'), alt: 'Пошук рейсів' },
] as const

export default function HomeHero() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [fromId, setFromId] = useState<number>()
  const [toId, setToId] = useState<number>()
  const [date, setDate] = useState('')

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500)
    return () => window.clearInterval(id)
  }, [])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (fromId) params.set('from_city_id', String(fromId))
    if (toId) params.set('to_city_id', String(toId))
    if (date) params.set('date_from', date)
    navigate(`/search${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <section className="home-hero relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0" aria-hidden>
        {SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={`home-hero__slide absolute inset-0 h-full w-full object-cover transition-opacity duration-1400 ease-out ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/60 to-ink/30" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-ink/30" />
      </div>

      <div className="container-site relative z-10 flex min-h-[min(78vh,720px)] flex-col justify-center pb-14 pt-24 md:pb-20 md:pt-28">
        <h1 className="max-w-3xl font-display text-[28px] font-medium uppercase leading-[1.15] text-white sm:text-4xl md:text-5xl">
          Міжнародні перевезення для українців
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
          Регулярні маршрутки та попутки по Європі. Знайдіть рейс, забронюйте місце або звʼяжіться з перевіреним перевізником.
        </p>

        <form onSubmit={onSearch} className="mt-8 w-full max-w-3xl space-y-3 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <CityPicker label="Звідки" value={fromId} onChange={(id) => setFromId(id)} />
            <CityPicker label="Куди" value={toId} onChange={(id) => setToId(id)} />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Дата від</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-accent w-full min-h-12 md:w-auto md:px-8" disabled={!fromId || !toId}>
                Знайти рейси
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link to="/cities" className="rounded-full border border-white/30 px-4 py-2 text-white/90 transition hover:bg-white/10">
            Напрямки
          </Link>
          <Link to="/carriers" className="rounded-full border border-white/30 px-4 py-2 text-white/90 transition hover:bg-white/10">
            Перевізники
          </Link>
          <Link to="/register/driver" className="rounded-full border border-white/30 px-4 py-2 text-white/90 transition hover:bg-white/10">
            Я перевізник
          </Link>
        </div>
      </div>
    </section>
  )
}
