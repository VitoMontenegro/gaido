import { type ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, articlesApi, resolveMediaUrl, type PublicGuide } from '@gaido/api-client/api/client'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import JournalArticleCard from '../components/JournalArticleCard'
import ExcursionCard, { excursionCardPropsFromPartial } from '../components/ExcursionCard'
import GuideCard from '../components/GuideCard'
import HorizontalSwiper from '../components/HorizontalSwiper'
import HomeHero from '../components/HomeHero'
import PopularDestinationsRow from '../components/home/PopularDestinationsRow'
import CountriesDirectory from '../components/countries/CountriesDirectory'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { Seo } from '../lib/seo'
import HomeReviews from '../components/HomeReviews'
import { buildGuidesHomeJsonLd } from '../lib/excursionListingSchema'
import { resolveCountryCatalog } from '../lib/countryCatalog'
import { GUIDES_HOME_SEO_TEXT, homeSeoDescription, homeSeoHeading, homeSeoTitle } from '../lib/seoTemplates'
import type { ExcursionItem } from '../components/excursionUi'
import { useRecentViews, validateRecentViews, type RecentView } from '../hooks/useRecentViews'
function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="section-title min-w-0">{title}</h2>
      {action}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-divider">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
        {question}
        <span className="shrink-0 text-brand-500 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <p className="pb-5 leading-relaxed text-muted">{answer}</p>
    </details>
  )
}

function RecentCard({ item }: { item: RecentView }) {
  if (item.type === 'excursion') {
    return (
      <ExcursionCard
        compact
        e={excursionCardPropsFromPartial({
          slug: item.slug,
          title: item.title,
          city_name: item.subtitle,
          description: item.description,
          price_from: item.price,
          currency: item.currency,
          cover_image_url: item.cover_url,
          rating_avg: item.rating_avg,
          rating_count: item.rating_count,
        })}
      />
    )
  }

  return (
    <Link
      to={`/guide/${item.slug}`}
      className="group card overflow-hidden p-0 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="p-4">
        <p className="text-sm text-muted-light">Гід</p>
        <h3 className="mt-1 line-clamp-2 font-display font-medium uppercase text-ink group-hover:text-brand-700">
          {item.title}
        </h3>
        {item.subtitle && <p className="mt-1 line-clamp-1 text-sm text-muted">{item.subtitle}</p>}
      </div>
    </Link>
  )
}

function HomePageLoading() {
  return (
    <>
      <Seo title={homeSeoTitle()} path="/" />
      <div
        className="home-hero-v2 relative h-[min(24rem,calc(100dvh-4.75rem))] max-h-[24rem] animate-pulse bg-sky-100"
        aria-busy="true"
        aria-label="Завантаження головної сторінки"
      />
    </>
  )
}

export default function GuidesHomePage() {
  const { data: site, isError: siteError, error: siteErr, isLoading: siteLoading } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })
  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: ['map-points'],
    queryFn: () => catalogApi.mapPoints(),
  })
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['country-catalog'],
    queryFn: () => catalogApi.countryCatalog(),
  })
  const { data: articlesData } = useQuery({
    queryKey: ['articles', 'journal', 'home'],
    queryFn: () => articlesApi.list(4, 'journal'),
  })
  const { data: homeReviews } = useQuery({
    queryKey: ['reviews', 'home'],
    queryFn: () => reviewsApi.list({ limit: 6, offset: 0 }),
    staleTime: 60_000,
  })
  const recentRaw = useRecentViews()
  const recentKey = recentRaw.map((r) => `${r.type}:${r.slug}`).join('|')
  const { data: recentValid, isPending: recentValidating } = useQuery({
    queryKey: ['recent-views-valid', recentKey],
    queryFn: validateRecentViews,
    staleTime: 60_000,
    enabled: recentRaw.length > 0,
  })
  const recent = (recentValid ?? [])
    .filter((item) => item.type === 'excursion')
    .slice(0, 8)

  const points = pointsData?.items ?? []
  const countries = useMemo(
    () => resolveCountryCatalog(catalogData?.items, points, catalogLoading),
    [catalogData?.items, points, catalogLoading],
  )
  const popularCountries = useMemo(
    () =>
      [...countries]
        .sort(
          (a, b) =>
            b.excursion_count - a.excursion_count ||
            b.city_count - a.city_count ||
            a.name.localeCompare(b.name, 'uk'),
        )
        .slice(0, 6),
    [countries],
  )
  const directoryLoading = countries.length === 0 && (pointsLoading || catalogLoading)

  if (siteLoading) {
    return <HomePageLoading />
  }

  if (siteError || !site) {
    return (
      <div className="container-site py-12">
        <ApiErrorBanner error={siteErr ?? new Error('API недоступний')} hint="Перевірте, що backend запущений (./run-local.sh або ./restart-local.sh)." />
      </div>
    )
  }

  const content = site.home.content
  const featuredGuides = site.home.featured_guides ?? []
  const latestExcursions = (site.home.latest_excursions ?? []) as ExcursionItem[]
  const newExcursions = latestExcursions.slice(0, 8)
  const destinations = site.home.popular_destinations ?? []
  const homeFaq = content.faq.map((item) => ({ question: item.question, answer: item.answer }))
  const seoDescription = homeSeoDescription(content.seo_description, content.hero_subtitle)
  const homeJsonLd = buildGuidesHomeJsonLd({
    excursions: newExcursions.length > 0 ? newExcursions : ((site.home.featured_excursions ?? []) as ExcursionItem[]),
    guides: featuredGuides.map((g) => ({ display_name: g.display_name, slug: g.slug })),
    countries: destinations.map((g) => ({ name: g.country_name, slug: g.country_slug })),
    faq: homeFaq,
    pageName: homeSeoHeading(content.seo_title),
    pageDescription: seoDescription,
    pagePath: '/',
    pageImage: content.seo_image_url || undefined,
  })
  const seoTextParagraphs = GUIDES_HOME_SEO_TEXT.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const journalArticles = articlesData?.items ?? []
  const cta = content.cta
  const aboutImage = resolveMediaUrl(content.about_image_url)
  const aboutParagraphs = (content.about_text ?? '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const showAbout = aboutParagraphs.length > 0 || Boolean(content.about_image_url)
  const aboutButtonLabel = content.about_button_label || 'Дізнатися більше'
  const aboutButtonUrl = content.about_button_url || '/about'

  return (
    <div className="guides-home">
      <Seo
        title={homeSeoTitle(content.seo_title)}
        description={seoDescription}
        path="/"
        image={content.seo_image_url || undefined}
        jsonLd={homeJsonLd.length > 0 ? homeJsonLd : undefined}
      />

      <HomeHero
        heading={homeSeoHeading(content.seo_title)}
        eyebrow={(content.hero_title ?? '').trim() || undefined}
        subtitle={(content.hero_subtitle ?? '').trim()}
      />

      {popularCountries.length > 0 && (
        <section className="container-site py-10 md:py-12">
          <SectionTitle
            title="Популярні напрямки"
            action={
              <Link to="/countries" className="link-accent text-sm normal-case">
                Дивитись усі →
              </Link>
            }
          />
          <PopularDestinationsRow countries={popularCountries} />
        </section>
      )}

      <section className="container-site pb-10 md:pb-14">
        <CountriesDirectory
          variant="home"
          points={points}
          countries={countries}
          loading={directoryLoading}
        />
      </section>

      {newExcursions.length > 0 && (
        <section className="border-t border-divider py-8 md:py-10">
          <div className="container-site">
            <SectionTitle
              title="Нові екскурсії"
              action={
                <Link to="/search" className="link-accent text-sm normal-case">
                  Усі екскурсії →
                </Link>
              }
            />
            <HorizontalSwiper>
              {newExcursions.map((e) => (
                <ExcursionCard key={e.id} e={e} compact />
              ))}
            </HorizontalSwiper>
          </div>
        </section>
      )}

      {recentRaw.length > 0 && !recentValidating && recent.length > 0 && (
        <section className="border-y border-divider py-8 md:py-10">
          <div className="container-site">
            <SectionTitle title="Ви недавно переглядали" />
            <HorizontalSwiper>
              {recent.map((item) => (
                <RecentCard key={`${item.type}-${item.slug}`} item={item} />
              ))}
            </HorizontalSwiper>
          </div>
        </section>
      )}

      {(homeReviews?.items.length ?? 0) > 0 && (
        <HomeReviews
          reviews={homeReviews?.items ?? []}
          ratingAvg={homeReviews?.rating_avg ?? 0}
          ratingCount={homeReviews?.rating_count ?? 0}
        />
      )}

      {featuredGuides.length > 0 && (
        <section className="py-12 md:py-14">
          <div className="container-site">
            <SectionTitle
              title="Фаворити мандрівників"
              action={
                <Link to="/guides" className="link-accent text-sm normal-case">
                  Усі гіди →
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredGuides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      {seoTextParagraphs.length > 0 && (
        <section className="container-site py-12">
          <h2 className="section-title-sm mb-4">Екскурсії українською за кордоном</h2>
          {seoTextParagraphs.map((paragraph, i) => (
            <p key={i} className={`max-w-4xl text-base leading-relaxed text-muted${i > 0 ? ' mt-4' : ''}`}>
              {paragraph}
            </p>
          ))}
        </section>
      )}

      {journalArticles.length > 0 && (
        <section className="border-y border-divider bg-surface py-8 md:py-10">
          <div className="container-site">
            <SectionTitle
              title="Журнал"
              action={
                <Link to="/journal" className="link-accent text-sm normal-case">
                  Усі статті →
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {journalArticles.map((article) => (
                <JournalArticleCard key={article.id} article={article} heading="h3" />
              ))}
            </div>
          </div>
        </section>
      )}

      {showAbout && (
        <section className="bg-surface py-14">
          <div className="container-site grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="section-title-sm mb-4">{content.about_title || 'Про нас'}</h2>
              {aboutParagraphs.map((paragraph, i) => (
                <p key={i} className={`text-base leading-relaxed text-muted${i > 0 ? ' mt-4' : ''}`}>
                  {paragraph}
                </p>
              ))}
              {aboutButtonLabel && aboutButtonUrl && (
                aboutButtonUrl.startsWith('http') ? (
                  <a href={aboutButtonUrl} className="btn-accent mt-6">
                    {aboutButtonLabel}
                  </a>
                ) : (
                  <Link to={aboutButtonUrl} className="btn-accent mt-6">
                    {aboutButtonLabel}
                  </Link>
                )
              )}
            </div>
            {aboutImage ? (
              <img
                src={aboutImage}
                alt={content.about_title || 'Про нас'}
                className="aspect-4/3 w-full rounded-[28px] object-cover"
                loading="lazy"
              />
            ) : (
              <div className="aspect-4/3 rounded-[28px] bg-sand-100" />
            )}
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section className="bg-surface py-14">
          <div className="container-site max-w-4xl">
            <SectionTitle title="Часті запитання" />
            <div className="card px-4 md:px-6">
              {content.faq.map((item) => (
                <FAQItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-site pb-16 pt-6">
        <div className="cta-panel grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-12 md:p-10 lg:p-12">
          <div>
            <h2 className="font-display text-xl font-medium uppercase text-white sm:text-2xl">
              {cta.title}
            </h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/75">
              {cta.text}
            </p>
            {cta.schedule && <p className="badge-teal mt-5">{cta.schedule}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={cta.primary_url} className="btn-accent min-w-45 justify-center">
              {cta.primary_label}
            </Link>
            <Link
              to={cta.secondary_url}
              className="inline-flex min-h-10 min-w-45 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-1 text-base font-medium text-white transition hover:bg-white/20"
            >
              {cta.secondary_label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
