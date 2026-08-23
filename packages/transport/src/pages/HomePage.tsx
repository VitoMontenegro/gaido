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

        <section className="prefooter-cta">
          <div className="prefooter-cta__grid">
            <div className="prefooter-cta__panel prefooter-cta__panel--left">
              <div className="prefooter-cta__info">
                <h2 className="prefooter-cta__title">Шукаєте поїздку?</h2>
                <p className="prefooter-cta__text">
                  Знайдіть рейс серед <strong>перевірених перевізників</strong> — міжнародні маршрутки та попутки для українців за кордоном.
                </p>
              </div>
              <div className="prefooter-cta__meta">
                <div className="prefooter-cta__meta-label">Пошук рейсів</div>
                <div className="prefooter-cta__meta-value">Безкоштовно · Щодня</div>
              </div>
              <Link to="/search" className="prefooter-cta__btn prefooter-cta__btn--accent">
                Знайти рейс
              </Link>
              <svg className="prefooter-cta__decoration" width="180" height="160" viewBox="0 0 180 160" fill="none" aria-hidden="true">
                <path
                  d="M24 48h132c6.6 0 12 5.4 12 12v52c0 6.6-5.4 12-12 12h-8l-8 16H40l-8-16h-8c-6.6 0-12-5.4-12-12V60c0-6.6 5.4-12 12-12zm16 64a12 12 0 1 0 0-24 12 12 0 0 0 0 24zm100 0a12 12 0 1 0 0-24 12 12 0 0 0 0 24zM48 68h84v8H48v-8z"
                  fill="#141414"
                />
              </svg>
            </div>

            <div className="prefooter-cta__panel prefooter-cta__panel--right">
              <div className="prefooter-cta__info">
                <h2 className="prefooter-cta__title">Стати перевізником</h2>
                <p className="prefooter-cta__text">
                  Додайте маршрути, отримуйте бронювання та <strong>зростайте разом з Vezu</strong>.
                </p>
              </div>
              <div className="prefooter-cta__actions">
                <Link to="/register/driver" className="prefooter-cta__btn prefooter-cta__btn--light">
                  Зареєструватись
                </Link>
                <Link to="/carriers" className="prefooter-cta__link">
                  Переглянути перевізників →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
