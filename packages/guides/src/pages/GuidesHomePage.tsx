import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, articlesApi, resolveMediaUrl, type HomeCategoryTile, type PublicGuide } from '@gaido/api-client/api/client'
import JournalArticleCard from '../components/JournalArticleCard'
import ExcursionCard, { excursionCardPropsFromPartial } from '../components/ExcursionCard'
import GuideCard from '../components/GuideCard'
import HorizontalSwiper from '../components/HorizontalSwiper'
import HomeHero from '../components/HomeHero'
import CountryNameLink from '../components/CountryNameLink'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../lib/seo'
import { buildExcursionListingJsonLd } from '../lib/excursionListingSchema'
import { buildFaqPageJsonLd, buildWebSiteJsonLd } from '../lib/seoTemplates'
import { normalizeCategoryTiles } from '../lib/categoryTiles'
import type { ExcursionItem } from '../components/excursionUi'
import { useRecentViews, validateRecentViews, type RecentView } from '../hooks/useRecentViews'

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

function GuideCardFeatured({ guide }: { guide: PublicGuide }) {
  return <GuideCard guide={guide} />
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

function CategoryTile({ tile }: { tile: HomeCategoryTile }) {
  const img = resolveMediaUrl(tile.image_url)
  return (
    <Link to={tile.url} className="category-tile">
      {img && <img src={img} alt="" className="category-tile__img" loading="lazy" />}
      <span className="category-tile__label">{tile.label}</span>
    </Link>
  )
}

function HomePageLoading() {
  return (
    <>
      <Seo title={pageTitle()} path="/" />
      <div
        className="home-hero relative min-h-[min(78vh,720px)] animate-pulse bg-ink"
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
  const { data: articlesData } = useQuery({
    queryKey: ['articles', 'home'],
    queryFn: () => articlesApi.list(3),
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
  const featuredExcursions = (site.home.featured_excursions ?? []) as ExcursionItem[]
  const homeFaq = content.faq.map((item) => ({ question: item.question, answer: item.answer }))
  const homeJsonLd = [
    buildWebSiteJsonLd(),
    ...buildExcursionListingJsonLd(featuredExcursions, {
      name: 'Нові маршрути Gaido',
      description: content.hero_subtitle,
    }),
    ...(homeFaq.length > 0 ? [buildFaqPageJsonLd(homeFaq)] : []),
  ].filter(Boolean) as Record<string, unknown>[]
  const destinations = site.home.popular_destinations ?? []
  const categoryTiles = normalizeCategoryTiles(content.category_tiles)
  const journalArticles = articlesData?.items ?? []
  const cta = content.cta
  const aboutImage = resolveMediaUrl(content.about_image_url)
  const aboutParagraphs = (content.about_text ?? '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const showAbout = aboutParagraphs.length > 0 || Boolean(content.about_image_url)
  const aboutButtonLabel = content.about_button_label || 'Дізнатися більше'
  const aboutButtonUrl = content.about_button_url || '/about'

  return (
    <>
      <Seo
        title={pageTitle('Гіди та екскурсії')}
        description={content.hero_subtitle}
        path="/"
        jsonLd={homeJsonLd.length > 0 ? homeJsonLd : undefined}
      />

      <HomeHero title={content.hero_title} subtitle={content.hero_subtitle} />

      <section className="container-site py-6 md:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2.5">
          {categoryTiles.map((tile) => (
            <CategoryTile key={`${tile.url}-${tile.label}`} tile={tile} />
          ))}
        </div>
      </section>

      {recentRaw.length > 0 && !recentValidating && recent.length > 0 && (
        <section className="border-y border-divider bg-surface py-8 md:py-10">
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

      {featuredExcursions.length > 0 && (
        <section className="container-site py-14">
          <SectionTitle
            title="Нові маршрути"
            subtitle="Свіжі пропозиції від перевірених гідів"
            action={
              <Link to="/search" className="link-accent text-sm normal-case">
                Усі екскурсії →
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {featuredExcursions.slice(0, 5).map((e) => (
              <ExcursionCard key={e.id} e={e} compact />
            ))}
          </div>
        </section>
      )}

      {showAbout && (
        <section className="bg-surface py-14">
          <div className="container-site grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="section-title-sm mb-4">{content.about_title || 'Про нас'}</p>
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
              <img src={aboutImage} alt="" className="aspect-4/3 w-full rounded-[28px] object-cover" loading="lazy" />
            ) : (
              <div className="aspect-4/3 rounded-[28px] bg-sand-100" />
            )}
          </div>
        </section>
      )}

      {featuredGuides.length > 0 && (
        <section className="py-14">
          <div className="container-site">
            <SectionTitle
              title="Фаворити мандрівників"
              subtitle="Місцеві експерти з авторськими маршрутами"
              action={
                <Link to="/guides/countries" className="link-accent text-sm normal-case">
                  Усі гіди →
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredGuides.map((g) => (
                <GuideCardFeatured key={g.id} guide={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      {destinations.length > 0 && (
        <section className="container-site py-14">
          <SectionTitle
            title="Популярні напрямки"
            subtitle="Оберіть місто — знайдіть гіда та екскурсію"
            action={
              <Link to="/map" className="link-accent text-sm normal-case">
                Усі міста на карті →
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {destinations.map((group) => (
              <div key={group.country_slug} className="card">
                <h3 className="section-title-sm mb-3">
                  <CountryNameLink
                    slug={group.country_slug}
                    name={group.country_name}
                    className="text-teal font-semibold text-[16px] hover:text-teal-dark"
                  />
                </h3>
                <ul className="space-y-2">
                  {group.cities.map((city) => (
                    <li key={city.slug}>
                      <Link to={`/city/${city.slug}`} className="text-base text-[#4b4b4b] transition hover:text-ink hover:underline">
                        {city.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}



        {journalArticles.length > 0 && (
            <section className="border-y border-divider bg-surface py-8 md:py-10">
                <div className="container-site">
                    <SectionTitle
                        title="Журнал"
                        subtitle="Поради для мандрівників"
                        action={
                            <Link to="/journal" className="link-accent text-sm normal-case">
                                Усі статті →
                            </Link>
                        }
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {journalArticles.map((article) => (
                            <JournalArticleCard key={article.id} article={article} heading="h3" />
                        ))}
                    </div>
                </div>
            </section>
        )}

      {content.stats.length > 0 && (
        <section className="bg-ink py-14 text-white">
          <div className="container-site">
            <h2 className="section-title mb-10 text-center text-white">
              {content.stats_title}
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {content.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-4xl font-medium uppercase md:text-5xl">{stat.value}</p>
                  <p className="mt-2 text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.faq.length > 0 && (
        <section className="bg-surface py-14">
          <div className="container-site max-w-3xl">
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
            <h3 className="font-display text-xl font-medium uppercase text-white sm:text-2xl">
              {cta.title}
            </h3>
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
    </>
  )
}
