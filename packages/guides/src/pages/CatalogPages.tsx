import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import GuideCard, { GuideCardGrid } from '../components/GuideCard'
import { buildPlaceJsonLd } from '../lib/excursionListingSchema'
import { Seo } from '../lib/seo'
import {
  SEO_GUIDES_LIST_DESCRIPTION,
  SEO_GUIDES_LIST_HEADING,
  seoGuidesCountryDescription,
  seoGuidesCountryHeading,
  seoGuidesCountryTitle,
  seoGuidesListTitle,
} from '../lib/seoTemplates'
import { cn } from '@gaido/ui-primitives/cn'

const GUIDES_PAGE_SIZE = 15

function compareUkName(a: string, b: string) {
  return a.localeCompare(b, 'uk', { sensitivity: 'base' })
}

function CountryTile({ slug, name, guideCount }: { slug: string; name: string; guideCount: number }) {
  return (
    <Link
      to={`/guides/countries/${slug}`}
      className="group flex min-h-17 flex-col justify-between rounded-2xl border border-border bg-surface p-3 transition hover:border-brand-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    >
      <p className="font-display text-base font-medium normal-case text-ink group-hover:text-brand-700 md:text-lg">
        {name}
      </p>
      <p className="text-sm text-muted">
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

  const countryItems = useMemo(
    () => [...(countries?.items ?? [])].sort((a, b) => compareUkName(a.name, b.name)),
    [countries?.items],
  )
  const {
    data: allGuides,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: allGuidesLoading,
  } = useInfiniteQuery({
    queryKey: ['guides-all'],
    queryFn: ({ pageParam }) =>
      catalogApi.guides({ sort: 'name', limit: String(GUIDES_PAGE_SIZE), offset: String(pageParam) }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length
      if (typeof last.total === 'number') return next < last.total ? next : undefined
      return last.items.length >= GUIDES_PAGE_SIZE ? next : undefined
    },
  })
  const allGuideItems = allGuides?.pages.flatMap((page) => page.items) ?? []
  const jsonLd = useMemo(
    () =>
      countryItems.length > 0
        ? [{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Україномовні гіди за країнами',
            numberOfItems: countryItems.length,
            itemListElement: countryItems.map((c, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: c.name,
              url: `/guides/countries/${c.slug}`,
            })),
          }]
        : [],
    [countryItems],
  )

  return (
    <>
      <Seo
        title={seoGuidesListTitle()}
        description={SEO_GUIDES_LIST_DESCRIPTION}
        path="/guides"
        jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
      />
      <Breadcrumbs items={[{ label: 'Гіди' }]} currentPath="/guides" />
      <div className="container-site py-5 md:py-8">
        <h1 className="section-title mb-1 text-2xl md:text-[28px]">{SEO_GUIDES_LIST_HEADING}</h1>
        <p className="mb-6 text-sm text-muted md:mb-8 md:text-base">
          {SEO_GUIDES_LIST_DESCRIPTION}
        </p>

        <section>
          <h2 className="mb-4 font-display text-lg font-medium normal-case text-ink md:text-xl">Країни</h2>
          {countriesLoading ? (
            <p className="text-sm text-muted">Завантаження…</p>
          ) : countryItems.length === 0 ? (
            <p className="text-sm text-muted">Поки немає опублікованих гідів.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {countryItems.map((c) => (
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

        <section className="mt-10 border-t border-divider pt-8 md:mt-12 md:pt-10">
          <h2 className="mb-5 font-display text-lg font-medium normal-case text-ink md:text-xl">Усі гіди</h2>
          {allGuidesLoading ? (
            <p className="text-sm text-muted">Завантаження…</p>
          ) : allGuideItems.length === 0 ? (
            <p className="text-sm text-muted">Поки немає опублікованих гідів.</p>
          ) : (
            <>
              <GuideCardGrid>
                {allGuideItems.map((g) => (
                  <GuideCard key={g.id} guide={g} compact />
                ))}
              </GuideCardGrid>
              {hasNextPage && (
                <div className="pt-6 text-center">
                  <button
                    type="button"
                    className="btn-secondary px-6"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    {isFetchingNextPage ? 'Завантаження…' : 'Ще'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
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
  const guideItems = guides?.items ?? []
  const description = seoGuidesCountryDescription(title, country?.guide_count)

  const jsonLd = useMemo(() => {
    const schemas: Record<string, unknown>[] = [
      buildPlaceJsonLd({ name: title, path: `/guides/countries/${countrySlug}` }),
    ]
    if (guideItems.length > 0) {
      schemas.unshift({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: seoGuidesCountryHeading(title),
        numberOfItems: guideItems.length,
        itemListElement: guideItems.map((g, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: g.display_name,
          url: `/guide/${g.slug}`,
        })),
      })
    }
    return schemas
  }, [guideItems, title, countrySlug])

  return (
    <>
      <Seo
        title={seoGuidesCountryTitle(title)}
        description={description}
        path={`/guides/countries/${countrySlug}`}
        jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
      />
      <Breadcrumbs
        currentPath={`/guides/countries/${countrySlug}`}
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
          {seoGuidesCountryHeading(title)}
        </h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">
          {country
            ? `${country.guide_count} ${country.guide_count === 1 ? 'гід' : country.guide_count < 5 ? 'гіди' : 'гідів'}`
            : 'Гіди за країною'}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted">Завантаження…</p>
        ) : guideItems.length === 0 ? (
          <p className="text-sm text-muted">У цій країні поки немає опублікованих гідів.</p>
        ) : (
          <GuideCardGrid>
            {guideItems.map((g) => (
              <GuideCard key={g.id} guide={g} compact />
            ))}
          </GuideCardGrid>
        )}
      </div>
    </>
  )
}
