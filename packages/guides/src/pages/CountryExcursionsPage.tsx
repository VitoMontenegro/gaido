import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, placePagesApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard, { ExcursionCardGrid } from '../components/ExcursionCard'
import { PlaceBody, PlaceExcerpt } from '../components/PlacePageBlocks'
import SeoFaqSection from '../components/SeoFaqSection'
import type { ExcursionItem } from '../components/excursionUi'
import { buildExcursionListingJsonLd, buildPlaceJsonLd } from '../lib/excursionListingSchema'
import { Seo } from '../lib/seo'
import {
  buildFaqPageJsonLd,
  countryExcursionFaq,
  defaultCountryIntro,
  placeFaqOrDefault,
  placeSeoDescription,
  placeSeoTitle,
  seoCountryExcursionsDescription,
  seoCountryExcursionsTitle,
} from '../lib/seoTemplates'
import { cn } from '@gaido/ui-primitives/cn'

function excursionWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'екскурсія'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'екскурсії'
  return 'екскурсій'
}

export default function CountryExcursionsPage() {
  const { countrySlug = '' } = useParams()
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const country = (countries?.items ?? []).find((c) => c.slug === countrySlug)
  const { data: guides, isLoading: guidesLoading } = useQuery({
    queryKey: ['guides', 'country', countrySlug],
    queryFn: () => catalogApi.guides({ country_slug: countrySlug, limit: '50' }),
    enabled: !!countrySlug,
  })
  const { data: excursions, isLoading } = useQuery({
    queryKey: ['excursions', 'country', countrySlug],
    queryFn: () =>
      catalogApi.excursions({ country_slug: countrySlug, limit: '50' }) as Promise<{ items: ExcursionItem[] }>,
    enabled: !!countrySlug,
  })
  const { data: placePage } = useQuery({
    queryKey: ['place-page', 'country', countrySlug],
    queryFn: () => placePagesApi.public('country', countrySlug),
    enabled: !!countrySlug,
    retry: false,
  })

  const title = country?.name ?? countrySlug
  const guideItems = guides?.items ?? []
  const items = excursions?.items ?? []
  const faqItems = placeFaqOrDefault(
    placePage?.faq,
    !isLoading && items.length > 0 ? countryExcursionFaq(title) : [],
  )
  const seoDescription = placeSeoDescription(placePage?.seo_description, seoCountryExcursionsDescription(title, items.length))
  const excerptFallback = (!guidesLoading && !isLoading && (guideItems.length > 0 || items.length > 0))
    ? defaultCountryIntro(title)
    : ''

  const jsonLd = useMemo(() => {
    const schemas = buildExcursionListingJsonLd(items, {
      name: `Екскурсії в ${title}`,
      description: seoDescription,
    })
    schemas.push(buildPlaceJsonLd({ name: title, path: `/countries/${countrySlug}` }))
    if (faqItems.length > 0) schemas.push(buildFaqPageJsonLd(faqItems))
    return schemas
  }, [items, title, countrySlug, seoDescription, faqItems])

  return (
    <>
      <Seo
        title={placeSeoTitle(placePage?.seo_title, seoCountryExcursionsTitle(title))}
        description={seoDescription}
        path={`/countries/${countrySlug}`}
        image={placePage?.seo_image_url || undefined}
        jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
      />
      <Breadcrumbs
        currentPath={`/countries/${countrySlug}`}
        items={[
          { label: 'Екскурсії', to: '/search' },
          { label: title },
        ]}
      />
      <div className="container-site py-5 md:py-8">
        <Link to="/search" className="mb-4 inline-block text-sm text-teal hover:underline md:hidden">
          ← Усі екскурсії
        </Link>
        <h1 className={cn('section-title mb-1 text-2xl md:text-[28px]', !country && 'capitalize')}>
          Екскурсії {title}
        </h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">
          {isLoading
            ? 'Екскурсії за країною'
            : items.length > 0
              ? `${items.length} ${excursionWord(items.length)}`
              : 'Екскурсії за країною'}
        </p>

        <PlaceExcerpt value={placePage?.excerpt} fallback={excerptFallback} />

        <section className="min-h-[80px]">
          <h2 className="mb-4 text-xl font-semibold">Гіди</h2>
          {guidesLoading ? (
            <p className="text-sm text-muted">Завантаження…</p>
          ) : guideItems.length === 0 ? (
            <p className="text-sm text-muted">Поки немає гідів у цій країні.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {guideItems.map((g) => (
                <Link key={g.id} to={`/guide/${g.slug}`} className="card hover:shadow-md">{g.display_name}</Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 min-h-[120px]">
          <h2 className="mb-4 text-xl font-semibold">Екскурсії</h2>
          {isLoading ? (
            <p className="text-sm text-muted">Завантаження…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">У цій країні поки немає опублікованих екскурсій.</p>
          ) : (
            <ExcursionCardGrid>
              {items.map((e) => (
                <ExcursionCard key={e.id} e={e} compact />
              ))}
            </ExcursionCardGrid>
          )}
        </section>

        <PlaceBody html={placePage?.intro_html} />
        {faqItems.length > 0 && <SeoFaqSection items={faqItems} />}
      </div>
    </>
  )
}
