import { useState, type ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, articlesApi, resolveMediaUrl, type HomeCategoryTile, type PublicGuide, type ArticleListItem } from '../api/client'
import ExcursionCard, { excursionCardPropsFromPartial } from '../components/ExcursionCard'
import GuideCard from '../components/GuideCard'
import HorizontalSwiper from '../components/HorizontalSwiper'
import HomeHero from '../components/HomeHero'
import { pageTitle, SITE_TAGLINE } from '../lib/brand'
import { normalizeCategoryTiles } from '../lib/categoryTiles'
import type { ExcursionItem } from '../components/excursionUi'
import { useRecentViews, type RecentView } from '../hooks/useRecentViews'

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

function JournalPreviewCard({ article }: { article: ArticleListItem }) {
  const cover = resolveMediaUrl(article.cover_image_url)
  return (
    <Link to={`/journal/${article.slug}`} className="journal-card group">
      <div className="journal-card__media">
        {cover ? (
          <img src={cover} alt="" className="journal-card__img" loading="lazy" />
        ) : (
          <div className="journal-card__placeholder" />
        )}
      </div>
      <div className="journal-card__body">
        <h3 className="journal-card__title">{article.title}</h3>
        {article.excerpt && <p className="journal-card__excerpt line-clamp-3">{article.excerpt}</p>}
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { data: site, isLoading } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
  })
  const { data: articlesData } = useQuery({
    queryKey: ['articles', 'home'],
    queryFn: () => articlesApi.list(3),
  })
  const recent = useRecentViews().filter((item) => item.type === 'excursion').slice(0, 8)

  const content = site?.home.content
  const featuredGuides = site?.home.featured_guides ?? []
  const featuredExcursions = (site?.home.featured_excursions ?? []) as ExcursionItem[]
  const destinations = site?.home.popular_destinations ?? []
  const categoryTiles = normalizeCategoryTiles(content?.category_tiles)
  const journalArticles = articlesData?.items ?? []
  const cta = content?.cta
  const aboutImage = resolveMediaUrl(content?.about_image_url ?? '')

  return (
    <>
      <Helmet>
        <title>{pageTitle(SITE_TAGLINE)}</title>
        <meta name="description" content={content?.hero_subtitle ?? SITE_TAGLINE} />
      </Helmet>

      <HomeHero
        title={content?.hero_title ?? SITE_TAGLINE}
        subtitle={
          content?.hero_subtitle ??
          'Авторські маршрути від місцевих гідів — обирайте програму та звʼязуйтеся напряму'
        }
      />

      <section className="container-site py-6 md:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2.5">
          {categoryTiles.map((tile) => (
            <CategoryTile key={`${tile.url}-${tile.label}`} tile={tile} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
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

      {!isLoading && featuredExcursions.length > 0 && (
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

      {(content?.benefits?.length ?? 0) > 0 && (
        <section className="bg-surface py-14">
          <div className="container-site grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="section-title-sm mb-4">Про нас</p>
              <p className="text-base leading-relaxed text-muted">
                {content!.benefits[0]?.text ?? 'Ми віримо, що кожна подорож має бути яскравою — з енергією та відкриттями.'}
              </p>
              {content!.benefits.length > 1 && (
                <p className="mt-4 text-base leading-relaxed text-muted">{content!.benefits[1]?.text}</p>
              )}
              <Link to="/guides" className="btn-accent mt-6">
                Дізнатися більше
              </Link>
            </div>
            {aboutImage ? (
              <img src={aboutImage} alt="" className="aspect-[4/3] w-full rounded-[28px] object-cover" loading="lazy" />
            ) : (
              <div className="aspect-[4/3] rounded-[28px] bg-sand-100" />
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
                <Link to="/guides" className="link-accent text-sm normal-case">
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

      {!isLoading && destinations.length > 0 && (
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
                <h3 className="section-title-sm mb-3">{group.country_name}</h3>
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
                            <JournalPreviewCard key={article.id} article={article} />
                        ))}
                    </div>
                </div>
            </section>
        )}

      {(content?.stats?.length ?? 0) > 0 && (
        <section className="bg-ink py-14 text-white">
          <div className="container-site">
            <h2 className="section-title mb-10 text-center text-white">З нами подорожують мільйони</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {content!.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-4xl font-medium uppercase md:text-5xl">{stat.value}</p>
                  <p className="mt-2 text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(content?.faq?.length ?? 0) > 0 && (
        <section className="bg-surface py-14">
          <div className="container-site max-w-3xl">
            <SectionTitle title="Часті запитання" />
            <div className="card px-4 md:px-6">
              {content!.faq.map((item) => (
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
              {cta?.title ?? 'Зʼявились питання?'}
            </h3>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/75">
              {cta?.text ?? 'Звʼяжіться з нами — відповімо протягом 60 хвилин у робочий час'}
            </p>
            {(cta?.schedule ?? 'Пн–Нд 09:00 – 18:00') && (
              <p className="badge-teal mt-5">{cta?.schedule ?? 'Пн–Нд 09:00 – 18:00'}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={cta?.primary_url ?? '/search'} className="btn-accent min-w-[180px] justify-center">
              {cta?.primary_label ?? 'Знайти екскурсію'}
            </Link>
            <Link
              to={cta?.secondary_url ?? '/register'}
              className="inline-flex min-h-10 min-w-[180px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-1 text-base font-medium text-white transition hover:bg-white/20"
            >
              {cta?.secondary_label ?? 'Стати гідом'}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
