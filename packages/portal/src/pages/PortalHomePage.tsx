import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, resolveMediaUrl, type CountryWithGuides, type Excursion, type PublicGuide } from '@gaido/api-client/api/client'
import { guidesUrl } from '@gaido/site-urls/site'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import ApiErrorBanner from '../components/ApiErrorBanner'
import GuideAvatar from '../components/GuideAvatar'
import HubCitiesMap from '../components/HubCitiesMap'
import { Seo } from '../lib/seo'
import {
  buildPortalHomeJsonLd,
  normalizePortalHub,
  portalHubCardHref,
  portalHubImageSrc,
  PORTAL_HOME_FAQ,
  PORTAL_HOME_SEO_DESCRIPTION,
  portalHomeSeoTitle,
} from '../lib/hubSeo'

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

function formatPrice(price?: number, currency?: string) {
  const amount = Number(price ?? 0)
  if (!amount) return ''
  const code = (currency || 'EUR').toUpperCase()
  const symbol = code === 'EUR' ? '€' : code === 'USD' ? '$' : code === 'UAH' ? '₴' : code
  return `від ${amount} ${symbol}`
}

function HubGuideCard({ guide }: { guide: PublicGuide }) {
  const about = (guide.about ?? '').replace(/\s+/g, ' ').trim()
  return (
    <a
      href={guidesUrl(`/guide/${guide.slug}`)}
      className="group card flex gap-4 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <GuideAvatar avatar={guide.avatar_url} name={guide.display_name} className="h-20 w-20 shrink-0 rounded-2xl" />
      <div className="min-w-0">
        <h3 className="font-display font-medium uppercase text-ink group-hover:text-brand-700">{guide.display_name}</h3>
        {guide.city_name && <p className="mt-1 text-sm text-muted-light">{guide.city_name}</p>}
        {guide.type_badge && <span className="badge-teal mt-2">{guide.type_badge}</span>}
        <p className="mt-2 line-clamp-2 text-sm text-muted">{about || 'Місцевий експерт з авторськими маршрутами'}</p>
      </div>
    </a>
  )
}

function HubExcursionSection({
  title,
  subtitle,
  items,
  limit = 8,
}: {
  title: string
  subtitle: string
  items: Excursion[]
  limit?: number
}) {
  if (items.length === 0) return null
  return (
    <section className="container-site py-14">
      <SectionTitle
        title={title}
        subtitle={subtitle}
        action={
          <a href={guidesUrl('/search')} className="link-accent text-sm normal-case">
            Усі екскурсії →
          </a>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, limit).map((item) => (
          <HubExcursionCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function HubExcursionCard({ item }: { item: Excursion }) {
  const cover = resolveMediaUrl(item.cover_image_url ?? '')
  const price = formatPrice(item.price_from, item.currency)
  return (
    <a
      href={guidesUrl(`/excursion/${item.slug}`)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="aspect-4/3 overflow-hidden bg-sand-100">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-sand-100" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {(item.city_name || item.country_name) && (
          <p className="line-clamp-1 text-xs text-muted-light">
            {[item.city_name, item.country_name].filter(Boolean).join(', ')}
          </p>
        )}
        <h3 className="mt-1.5 line-clamp-2 font-semibold leading-[110%] text-ink group-hover:text-teal">
          {item.title}
        </h3>
        {price && <p className="mt-auto pt-2 text-sm font-semibold text-ink">{price}</p>}
      </div>
    </a>
  )
}

export default function PortalHomePage() {
  const { data: site, isError: siteError, error: siteErr } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })
  const { data: countriesData } = useQuery({
    queryKey: ['countries-with-guides'],
    queryFn: () => catalogApi.countriesWithGuides(),
    staleTime: 60_000,
  })

  const hub = normalizePortalHub(site?.portal_hub)
  const featuredGuides = site?.home.featured_guides ?? []
  const featuredExcursions = site?.home.featured_excursions ?? []
  const latestExcursions = site?.home.latest_excursions ?? []
  const destinations = site?.home.popular_destinations ?? []
  const popularSlugs = useMemo(() => new Set(destinations.map((g) => g.country_slug)), [destinations])
  const moreCountries = (countriesData?.items ?? []).filter((c: CountryWithGuides) => !popularSlugs.has(c.slug))
  const jsonLd = buildPortalHomeJsonLd({
    guides: featuredGuides,
    excursions: latestExcursions.length > 0 ? latestExcursions : featuredExcursions,
    countries: countriesData?.items ?? destinations.map((g) => ({ name: g.country_name, slug: g.country_slug })),
  })

  return (
    <>
      <Seo
        title={portalHomeSeoTitle()}
        description={PORTAL_HOME_SEO_DESCRIPTION}
        path="/"
        jsonLd={jsonLd}
      />

      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${staticAssetUrl('/images/home/world-bg.jpg')})` }}
        />
        <div className="absolute inset-0 bg-page/50" />
      </div>

      <div className="relative z-10">
      <section className="container-site py-10 md:py-14">
        <p className="text-sm font-medium uppercase tracking-wide text-teal">Українці в усьому світі</p>
        <h1 className="section-title mt-2">{hub.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted">{hub.lead}</p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {hub.cards.map((card) => (
            <a
              key={card.id}
              href={portalHubCardHref(card.id)}
              className="card group overflow-hidden p-0 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            >
              <div className="aspect-16/10 overflow-hidden bg-sand-100">
                <img src={portalHubImageSrc(card.image_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-5">
                <h2 className="section-title-sm group-hover:text-brand-700">{card.title}</h2>
                {card.text.split(/\n\n+/).map((p) => (
                  <p key={p.slice(0, 48)} className="mt-3 text-sm leading-relaxed text-muted">
                    {p}
                  </p>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {siteError && (
        <div className="container-site pb-6">
          <ApiErrorBanner error={siteErr} hint="Не вдалося завантажити добірку гідів і екскурсій" />
        </div>
      )}

      <HubExcursionSection
        title="Маршрути з каталогу"
        subtitle="Просувані екскурсії з каталогу гідів"
        items={featuredExcursions}
        limit={4}
      />

      <HubExcursionSection
        title="Останні додані екскурсії"
        subtitle="Свіжі маршрути, які щойно зʼявились у каталозі"
        items={latestExcursions}
      />

      {featuredGuides.length > 0 && (
        <section className="py-14">
          <div className="container-site">
            <SectionTitle
              title="Гіди з каталогу"
              subtitle="Кілька профілів — повний список у розділі гідів"
              action={
                <a href={guidesUrl('/guides')} className="link-accent text-sm normal-case">
                  Усі гіди →
                </a>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredGuides.slice(0, 4).map((guide) => (
                <HubGuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </div>
        </section>
      )}

      {destinations.length > 0 && (
        <section className="container-site py-14">
          <SectionTitle
            title="Країни та міста з гідами"
            subtitle="Оберіть напрямок — знайдіть гіда та екскурсію українською"
            action={
              <a href={guidesUrl('/guides')} className="link-accent text-sm normal-case">
                Усі країни →
              </a>
            }
          />
          <div className="mb-8 h-72 overflow-hidden rounded-[28px] border border-divider bg-surface md:h-96">
            <HubCitiesMap />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {destinations.map((group) => (
              <div key={group.country_slug} className="card">
                <h3 className="section-title-sm mb-2">
                  <a
                    href={guidesUrl(`/guides/countries/${group.country_slug}`)}
                    className="text-teal font-semibold hover:text-teal-dark"
                  >
                    {group.country_name}
                  </a>
                </h3>
                <p className="mb-3 text-sm text-muted">
                  Україномовні гіди та екскурсії: {group.country_name}
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-2">
                  {group.cities.map((city) => (
                    <li key={city.slug}>
                      <a href={guidesUrl(`/city/${city.slug}`)} className="text-base text-[#4b4b4b] transition hover:text-ink hover:underline">
                        {city.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {moreCountries.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {moreCountries.map((country) => (
                <li key={country.slug}>
                  <a href={guidesUrl(`/guides/countries/${country.slug}`)} className="text-muted transition hover:text-ink hover:underline">
                    {country.name}
                    {country.guide_count > 0 ? ` · ${country.guide_count}` : ''}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="py-14">
        <div className="container-site max-w-3xl">
          <SectionTitle title="Часті запитання" />
          <div className="card px-4 md:px-6">
            {PORTAL_HOME_FAQ.map((item) => (
              <FAQItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>
      </div>
    </>
  )
}
