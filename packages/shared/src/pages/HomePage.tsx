import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PartnerServicesBar from '../components/PartnerServicesBar'
import LocationPicker from '../components/location/LocationPicker'
import { discoverApi } from '../api/discover'
import { useLocation } from '../contexts/LocationContext'
import { Seo } from '../lib/seo'
import { SITE_NAME, pageTitle } from '../lib/brand'

export default function HomePage() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => discoverApi.categories(),
  })

  return (
    <>
      <Seo
        title={pageTitle()}
        description="Знайдіть послуги, спеціалістів, бізнеси, роботу та допомогу поруч із вами."
        path="/"
      />

      <PartnerServicesBar />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="container-site py-12 md:py-20">
          <p className="mb-2 text-sm uppercase tracking-widest text-brand-300">🇺🇦 {SITE_NAME}</p>
          <h1 className="font-display text-3xl font-medium uppercase md:text-5xl">Для українців — від українців</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Знайдіть послуги, спеціалістів, бізнеси, роботу та допомогу поруч із вами — у будь-якому місті світу.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <p className="mb-4 font-medium">📍 Де ви зараз?</p>
              <LocationPicker onSelected={() => navigate('/discover')} />
              {loc.hasLocation && (
                <button type="button" className="btn-primary mt-5" onClick={() => navigate('/discover')}>
                  Що є поруч? →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(categories?.items ?? []).slice(0, 6).map((c) => (
                <Link
                  key={c.slug}
                  to={`/discover?category=${c.slug}`}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <p className="mt-2 text-sm font-medium leading-snug">{c.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-site py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Усі сервіси</h2>
            <p className="mt-2 text-muted">Оберіть напрямок — від гідів до транспорту та допомоги</p>
          </div>
          <Link to="/discover" className="link-accent text-sm">
            Каталог поруч →
          </Link>
        </div>
        <div className="mt-6">
          <PartnerServicesBar variant="compact" />
        </div>
      </section>

      <section className="border-t border-divider bg-surface py-10">
        <div className="container-site grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-display text-lg font-medium text-ink">Екскурсії та гіди</h3>
            <p className="mt-2 text-sm text-muted">
              Авторські маршрути, місцеві експерти та подорожі українською — як на{' '}
              <a href="https://gaido.top/" className="link-accent" target="_blank" rel="noreferrer">
                gaido.top
              </a>
              .
            </p>
            <Link to="/guides" className="btn-secondary mt-4 inline-flex">
              Перейти до гідів →
            </Link>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-lg font-medium text-ink">Не знайшли потрібне?</h3>
            <p className="mt-2 text-sm text-muted">Опишіть запит — постачальники з вашого міста зможуть запропонувати послуги.</p>
            <Link to="/looking" className="btn-secondary mt-4 inline-flex">
              🔎 Я шукаю
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
