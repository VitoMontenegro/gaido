import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import GuideCard, { GuideCardGrid } from '../components/GuideCard'
import { pageTitle } from '@gaido/site-urls/brand'
import { cn } from '@gaido/ui-primitives/cn'

function CountryTile({ slug, name, guideCount }: { slug: string; name: string; guideCount: number }) {
  return (
    <Link
      to={`/guides/countries/${slug}`}
      className="group flex min-h-[88px] flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] md:min-h-[96px] md:p-5"
    >
      <p className="font-display text-base font-medium normal-case text-ink group-hover:text-brand-700 md:text-lg">
        {name}
      </p>
      <p className="mt-2 text-sm text-muted">
        {guideCount} {guideCount === 1 ? 'гід' : guideCount < 5 ? 'гіди' : 'гідів'}
      </p>
    </Link>
  )
}

export default function GuidesListPage() {
  const { data: countries, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries-with-guides'],
    queryFn: () => catalogApi.countriesWithGuides(),
  })
  const { data: topGuides } = useQuery({
    queryKey: ['guides-top'],
    queryFn: () => catalogApi.topGuides(10),
  })

  return (
    <>
      <Helmet><title>{pageTitle('Гіди')}</title></Helmet>
      <Breadcrumbs items={[{ label: 'Гіди' }]} />
      <div className="container-site py-5 md:py-8">
        <h1 className="section-title mb-1 text-2xl md:text-[28px]">Гіди</h1>
        <p className="mb-6 text-sm text-muted md:mb-8 md:text-base">
          Оберіть країну — побачите місцевих експертів із авторськими маршрутами
        </p>

        <section>
          <h2 className="mb-4 font-display text-lg font-medium normal-case text-ink md:text-xl">Країни</h2>
          {countriesLoading ? (
            <p className="text-sm text-muted">Завантаження…</p>
          ) : (countries?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted">Поки немає опублікованих гідів.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(countries?.items ?? []).map((c) => (
                <CountryTile key={c.id} slug={c.slug} name={c.name} guideCount={c.guide_count} />
              ))}
            </div>
          )}
        </section>

        {(topGuides?.items ?? []).length > 0 && (
          <section className="mt-10 border-t border-divider pt-8 md:mt-12 md:pt-10">
            <div className="mb-5">
              <h2 className="font-display text-lg font-medium normal-case text-ink md:text-xl">Топ гіди</h2>
              <p className="mt-1 text-sm text-muted">
                За відгуками мандрівників та активним просуванням на платформі
              </p>
            </div>
            <GuideCardGrid>
              {(topGuides?.items ?? []).map((g) => (
                <GuideCard key={g.id} guide={g} compact promoted={g.is_promoted} />
              ))}
            </GuideCardGrid>
          </section>
        )}
      </div>
    </>
  )
}

export function GuidesByCountryPage() {
  const { countrySlug = '' } = useParams()
  const { data: countries } = useQuery({
    queryKey: ['countries-with-guides'],
    queryFn: () => catalogApi.countriesWithGuides(),
  })
  const country = (countries?.items ?? []).find((c) => c.slug === countrySlug)
  const { data: guides, isLoading } = useQuery({
    queryKey: ['guides', 'country', countrySlug],
    queryFn: () =>
      catalogApi.guides({ country_slug: countrySlug, limit: '50' }),
    enabled: !!countrySlug,
  })

  const title = country?.name ?? countrySlug

  return (
    <>
      <Helmet><title>{pageTitle(title)}</title></Helmet>
      <Breadcrumbs
        items={[
          { label: 'Гіди', to: '/guides' },
          { label: title },
        ]}
      />
      <div className="container-site py-5 md:py-8">
        <Link to="/guides" className="mb-4 inline-block text-sm text-teal hover:underline md:hidden">
          ← Усі країни
        </Link>
        <h1 className={cn('section-title mb-1 text-2xl md:text-[28px]', !country && 'capitalize')}>
          {title}
        </h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">
          {country
            ? `${country.guide_count} ${country.guide_count === 1 ? 'гід' : country.guide_count < 5 ? 'гіди' : 'гідів'}`
            : 'Гіди за країною'}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted">Завантаження…</p>
        ) : (guides?.items ?? []).length === 0 ? (
          <p className="text-sm text-muted">У цій країні поки немає активних гідів.</p>
        ) : (
          <GuideCardGrid>
            {(guides?.items ?? []).map((g) => (
              <GuideCard key={g.id} guide={g} compact />
            ))}
          </GuideCardGrid>
        )}
      </div>
    </>
  )
}
