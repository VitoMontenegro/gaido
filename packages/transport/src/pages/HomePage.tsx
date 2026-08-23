import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { carrierApi } from '@gaido/api-client/api/carrier'
import { transportApi } from '@gaido/api-client/api/transport'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { pageTitle } from '@gaido/site-urls/brand'
import HomeHero from '../components/HomeHero'
import RideCard from '../components/RideCard'
import CarrierCard, { CarrierCardGrid } from '../components/CarrierCard'
import { Seo } from '../lib/seo'
import { HOME_CATEGORY_TILES, HOME_FAQ, POPULAR_ROUTES } from '../lib/popularRoutes'
import { buildFaqPageJsonLd, buildWebSiteJsonLd } from '../lib/seoTemplates'

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-2 text-base text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-divider">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        {question}
        <span className={`shrink-0 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <p className="pb-5 leading-relaxed text-muted">{answer}</p>}
    </div>
  )
}

function CategoryTile({ label, url, image }: { label: string; url: string; image: string }) {
  return (
    <Link to={url} className="category-tile">
      <img src={staticAssetUrl(image)} alt="" className="category-tile__img" loading="lazy" />
      <span className="category-tile__label">{label}</span>
    </Link>
  )
}

export default function HomePage() {
  const { data: ridesData } = useQuery({
    queryKey: ['home-rides'],
    queryFn: () => transportApi.search({ limit: 8 }),
  })
  const { data: carriersData } = useQuery({
    queryKey: ['home-carriers'],
    queryFn: () => carrierApi.list({ limit: 4 }),
  })

  const rides = ridesData?.items ?? []
  const carriers = carriersData?.items ?? []

  return (
    <>
      <Seo
        title={pageTitle('Міжнародні перевезення')}
        description="Регулярні маршрутки та попутки для українців за кордоном. Пошук рейсів, перевірені перевізники, бронювання на Vezu."
        path="/"
        jsonLd={[buildWebSiteJsonLd(), buildFaqPageJsonLd(HOME_FAQ)]}
      />
      <HomeHero />

      <div className="container-site space-y-16 py-14 md:py-20">
        <section>
          <SectionTitle title="Куди поїхати?" subtitle="Оберіть розділ або одразу шукайте рейс" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {HOME_CATEGORY_TILES.map((tile) => (
              <CategoryTile key={tile.url} {...tile} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle
            title="Популярні маршрути"
            subtitle="Найчастіші напрямки для українців за кордоном"
            action={<Link to="/cities" className="text-sm font-medium text-teal hover:underline">Усі напрямки →</Link>}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_ROUTES.map((route) => (
              <Link
                key={route.label}
                to={`/routes/${route.from}/${route.to}`}
                className="card flex items-center justify-between p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
              >
                <span className="font-medium text-ink">{route.label}</span>
                <span className="text-teal">→</span>
              </Link>
            ))}
          </div>
        </section>

        {rides.length > 0 && (
          <section>
            <SectionTitle
              title="Актуальні рейси"
              action={<Link to="/search" className="text-sm font-medium text-teal hover:underline">Усі рейси →</Link>}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {rides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          </section>
        )}

        {carriers.length > 0 && (
          <section>
            <SectionTitle
              title="Перевірені перевізники"
              action={<Link to="/carriers" className="text-sm font-medium text-teal hover:underline">Усі перевізники →</Link>}
            />
            <CarrierCardGrid>
              {carriers.map((c) => (
                <CarrierCard key={c.provider_id} carrier={c} compact />
              ))}
            </CarrierCardGrid>
          </section>
        )}

        <section className="card p-6 md:p-8">
          <SectionTitle title="Як це працює" />
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'Оберіть маршрут', text: 'Знайдіть рейс за містами відправлення та прибуття або перегляньте популярні напрямки.' },
              { step: '2', title: 'Увійдіть в акаунт', text: 'Створіть акаунт, щоб бачити контакти та бронювати місця.' },
              { step: '3', title: 'Забронюйте', text: 'Оберіть дату, кількість місць і підтвердіть бронювання з перевізником.' },
            ].map((item) => (
              <li key={item.step} className="space-y-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 font-display text-lg font-bold text-teal">{item.step}</span>
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionTitle title="Часті питання" />
          <div className="card px-5 md:px-8">
            {HOME_FAQ.map((item) => (
              <FAQItem key={item.question} {...item} />
            ))}
          </div>
        </section>

        <section className="cta-panel">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Шукаєте поїздку?</h2>
              <p className="mt-2 max-w-lg text-white/80">Знайдіть рейс серед перевірених перевізників або зареєструйтесь як водій.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/search" className="btn-accent bg-white text-ink hover:bg-sand-50">Знайти рейс</Link>
              <Link to="/register/driver" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                Стати перевізником
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
