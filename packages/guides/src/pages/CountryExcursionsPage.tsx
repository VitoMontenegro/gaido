import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard, { ExcursionCardGrid } from '../components/ExcursionCard'
import SeoFaqSection from '../components/SeoFaqSection'
import type { ExcursionItem } from '../components/excursionUi'
import { buildExcursionListingJsonLd, buildPlaceJsonLd } from '../lib/excursionListingSchema'
import { Seo } from '../lib/seo'
import {
  buildFaqPageJsonLd,
  countryExcursionFaq,
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
  const { data: excursions, isLoading } = useQuery({
    queryKey: ['excursions', 'country', countrySlug],
    queryFn: () =>
      catalogApi.excursions({ country_slug: countrySlug, limit: '50' }) as Promise<{ items: ExcursionItem[] }>,
    enabled: !!countrySlug,
  })

  const title = country?.name ?? countrySlug
  const items = excursions?.items ?? []
  const faqItems = countryExcursionFaq(title)
  const seoDescription = seoCountryExcursionsDescription(title, items.length)

  const jsonLd = useMemo(() => {
    const schemas = buildExcursionListingJsonLd(items, {
      name: `Екскурсії в ${title}`,
      description: seoDescription,
    })
    schemas.push(buildPlaceJsonLd({ name: title, path: `/countries/${countrySlug}` }))
    schemas.push(buildFaqPageJsonLd(faqItems))
    return schemas
  }, [items, title, countrySlug, seoDescription, faqItems])

  return (
    <>
      <Seo
        title={seoCountryExcursionsTitle(title)}
        description={seoDescription}
        path={`/countries/${countrySlug}`}
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
          Екскурсії в {title}
        </h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">
          {isLoading
            ? 'Екскурсії за країною'
            : items.length > 0
              ? `${items.length} ${excursionWord(items.length)}`
              : 'Екскурсії за країною'}
        </p>

        {!isLoading && items.length > 0 && (
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted md:text-base">
            Оберіть авторську екскурсію в {title} від місцевих гідів українською або англійською.
            Порівняйте ціни, перегляньте маршрути та напишіть гіду напряму для бронювання дати.
          </p>
        )}

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

        {!isLoading && items.length > 0 && <SeoFaqSection items={faqItems} />}
      </div>
    </>
  )
}
