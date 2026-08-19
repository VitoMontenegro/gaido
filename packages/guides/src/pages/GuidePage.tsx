import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, articlesApi, catalogApi, type PublicGuide } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard from '../components/ExcursionCard'
import GuideAvatar from '../components/GuideAvatar'
import GuideContactPills, { guideContactLinks } from '../components/GuideContactPills'
import JournalArticleCard from '../components/JournalArticleCard'
import type { ExcursionItem } from '../components/excursionUi'
import ReviewsSection from '../components/reviews/ReviewsSection'
import StarRating from '../components/reviews/StarRating'
import { trackRecentView, removeRecentView } from '../hooks/useRecentViews'
import { useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import { useTelegramBotURL } from '../hooks/useTelegramBotURL'
import { getApiErrorCode } from '@gaido/api-client/api/http'
import CatalogNotFound from '../components/CatalogNotFound'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../lib/seo'

export default function GuidePage() {
  const { slug = '' } = useParams()
  const { data: me } = useMe()
  const isGuideRole = useHasRole('ROLE_GUIDE')
  const { data: guide, isLoading, isError, error } = useQuery({
    queryKey: ['guide', slug],
    queryFn: () => catalogApi.guide(slug),
    retry: (_, err) => getApiErrorCode(err) !== 'NOT_FOUND',
  })
  const { data: myGuide } = useQuery({
    queryKey: ['my-guide-profile'],
    queryFn: () => api<{ id: number }>('/api/v1/account/guide/profile'),
    enabled: isGuideRole,
  })
  const { data: excursions } = useQuery({
    queryKey: ['guide-excursions', slug],
    queryFn: () => api<{ items: ExcursionItem[] }>(`/api/v1/guides/${slug}/excursions`),
    enabled: !!slug,
  })
  const { data: articlesData } = useQuery({
    queryKey: ['guide-articles', slug],
    queryFn: () => articlesApi.byGuide(slug, 12),
    enabled: !!slug,
  })

  const isGuideOwner = !!guide && myGuide?.id === guide.id

  useEffect(() => {
    if (!guide) return
    trackRecentView({
      type: 'guide',
      slug: guide.slug,
      title: guide.display_name,
      subtitle: guide.type_badge,
      cover_url: guide.avatar_url,
    })
  }, [guide])

  useEffect(() => {
    if (isError && getApiErrorCode(error) === 'NOT_FOUND' && slug) {
      removeRecentView('guide', slug)
    }
  }, [isError, error, slug])

  if (isLoading) return <div className="container-site p-8 text-muted">Завантаження…</div>
  if (isError || !guide) return <CatalogNotFound kind="guide" />

  return (
    <>
      <Seo
        title={pageTitle(guide.display_name)}
        description={guide.about ?? ''}
        path={`/guide/${guide.slug}`}
        image={guide.avatar_url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: guide.display_name,
          description: guide.about,
          image: guide.avatar_url,
          url: `/guide/${guide.slug}`,
        }}
      />

      <Breadcrumbs
        items={[
          { label: 'Гіди', to: '/guides' },
          { label: guide.display_name },
        ]}
      />

      <div className="bg-linear-to-b from-brand-50/80 to-sand-50 pb-12">
        <div className="container-site py-10">
          <GuideHero guide={guide} excursionCount={(excursions?.items ?? []).length} />
        </div>
      </div>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display mb-4 text-2xl font-bold">Екскурсії гіда</h2>
            {(excursions?.items ?? []).length === 0 ? (
              <p className="text-stone-600">Поки немає опублікованих екскурсій.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {(excursions?.items ?? []).map((e) => (
                  <ExcursionCard key={e.id} e={e} compact />
                ))}
              </div>
            )}
          </section>

          <ReviewsSection
            guideId={guide.id}
            excursions={excursions?.items ?? []}
            canReply={(r) => !!me && (isGuideOwner || me.id === r.author_id)}
            canDispute={() => isGuideOwner}
            invalidateKeys={[['reviews', 'guide', guide.id], ['guide', slug]]}
          />

          {(articlesData?.items ?? []).length > 0 && (
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="section-title-sm mb-1">Журнал</p>
                  <h2 className="font-display text-2xl font-bold">Статті гіда</h2>
                </div>
                <Link to="/journal" className="link-accent text-sm normal-case">
                  Увесь журнал →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(articlesData?.items ?? []).map((article) => (
                  <JournalArticleCard key={article.id} article={article} heading="h3" />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <ContactBlock guide={guide} />
        </aside>
      </div>

      <div className="container-site pb-10">
        <Link to="/guides/countries" className="text-brand-700 hover:underline">← Усі гіди</Link>
      </div>
    </>
  )
}

function GuideHero({ guide, excursionCount }: { guide: PublicGuide; excursionCount: number }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
      <div>
        {guide.type_badge && (
          <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-teal">
            {guide.type_badge}
          </span>
        )}
        <h1 className="font-display mt-3 text-4xl font-bold text-stone-900 md:text-5xl">{guide.display_name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-lg text-stone-600">
          <StarRating value={guide.rating_avg} size="md" />
          <span>{guide.rating_avg.toFixed(1)} · {guide.rating_count} відгуків · {excursionCount} екскурсій</span>
        </p>
        <p className="mt-6 max-w-3xl whitespace-pre-wrap leading-relaxed text-stone-700">
          {guide.about || "Опис з'явиться незабаром."}
        </p>
      </div>
      <GuideAvatar avatar={guide.avatar_url} name={guide.display_name} className="hidden aspect-square rounded-3xl shadow-lg lg:block" />
    </div>
  )
}

function ContactBlock({ guide }: { guide: PublicGuide }) {
  const telegramBotURL = useTelegramBotURL()
  const links = guideContactLinks(guide.contacts)

  return (
    <div className="card border-brand-200 bg-white shadow-md">
      <p className="font-display text-lg font-bold">Зв&apos;язатися з гідом</p>
      {links.length > 0 ? (
        <div className="mt-4 space-y-3">
          <GuideContactPills links={links} />
          {guide.contacts.response_hours && (
            <p className="text-sm text-stone-600">{guide.contacts.response_hours}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-600">
          {guide.contacts.visible
            ? 'Гід поки не додав контакти для звʼязку.'
            : 'Контакти доступні після активації розміщення гіда.'}
        </p>
      )}
      {/*{telegramBotURL && (
        <button
          type="button"
          data-telegram
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          Написати в підтримку
        </button>
      )}*/}
    </div>
  )
}
