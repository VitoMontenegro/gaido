import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, catalogApi, type PublicGuide } from '../api/client'
import { reviewsApi } from '../api/reviews'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard from '../components/ExcursionCard'
import GuideAvatar from '../components/GuideAvatar'
import type { ExcursionItem } from '../components/excursionUi'
import ReviewCard from '../components/reviews/ReviewCard'
import ReviewForm from '../components/reviews/ReviewForm'
import type { Review } from '../components/reviews/types'
import { trackRecentView } from '../hooks/useRecentViews'
import { useHasRole, useMe } from '../hooks/useAuth'
import { pageTitle } from '../lib/brand'
import { Seo } from '../lib/seo'

export default function GuidePage() {
  const { slug = '' } = useParams()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const isGuideRole = useHasRole('ROLE_GUIDE')
  const { data: guide, isLoading } = useQuery({
    queryKey: ['guide', slug],
    queryFn: () => catalogApi.guide(slug),
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
  const { data: reviews } = useQuery({
    queryKey: ['reviews', guide?.id],
    queryFn: () => api<{ items: Review[] }>(`/api/v1/reviews?guide_id=${guide!.id}`),
    enabled: !!guide?.id,
  })

  const reviewMutation = useMutation({
    mutationFn: (body: { excursion_id: number; rating: number; text: string }) =>
      reviewsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', guide?.id] })
    },
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

  if (isLoading) return <div className="p-8">Завантаження...</div>
  if (!guide) return <div className="p-8">Гіда не знайдено</div>

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

      <div className="bg-gradient-to-b from-brand-50/80 to-sand-50 pb-12">
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

          <section>
            <h2 className="font-display mb-4 text-2xl font-bold">Відгуки</h2>
            <ReviewForm
              excursions={excursions?.items ?? []}
              submitting={reviewMutation.isPending}
              error={reviewMutation.error}
              success={reviewMutation.isSuccess}
              onSubmit={(v) => reviewMutation.mutate(v)}
            />
            {(reviews?.items ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-stone-600">Поки немає відгуків. Будьте першим!</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {(reviews?.items ?? []).map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    canReply={!!me && (isGuideOwner || me.id === r.author_id)}
                    onReplied={() => qc.invalidateQueries({ queryKey: ['reviews', guide.id] })}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <ContactBlock guide={guide} />
        </aside>
      </div>

      <div className="container-site pb-10">
        <Link to="/guides" className="text-brand-700 hover:underline">← Усі гіди</Link>
      </div>
    </>
  )
}

function GuideHero({ guide, excursionCount }: { guide: PublicGuide; excursionCount: number }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
      <div>
        {guide.type_badge && (
          <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-brand-700">
            {guide.type_badge}
          </span>
        )}
        <h1 className="font-display mt-3 text-4xl font-bold text-stone-900 md:text-5xl">{guide.display_name}</h1>
        <p className="mt-3 text-lg text-stone-600">
          ★ {guide.rating_avg.toFixed(1)} · {guide.rating_count} відгуків · {excursionCount} екскурсій
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
  return (
    <div className="card border-brand-200 bg-white shadow-md">
      <p className="font-display text-lg font-bold">Зв&apos;язатися з гідом</p>
      {guide.contacts.visible ? (
        <div className="mt-4 space-y-2 text-sm">
          {guide.contacts.telegram && <p>Telegram: <span className="font-medium">{guide.contacts.telegram}</span></p>}
          {guide.contacts.phone && <p>Телефон: <span className="font-medium">{guide.contacts.phone}</span></p>}
          {guide.contacts.whatsapp && <p>WhatsApp: <span className="font-medium">{guide.contacts.whatsapp}</span></p>}
          {guide.contacts.email && <p>Email: <span className="font-medium">{guide.contacts.email}</span></p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-600">Контакти доступні після активації розміщення гіда.</p>
      )}
    </div>
  )
}
