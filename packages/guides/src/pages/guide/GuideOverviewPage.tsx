import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { guideApi } from '@gaido/api-client/api/client'
import { inquiriesApi } from '@gaido/api-client/api/inquiries'
import StatCard, { StatGrid } from '../../components/crm/StatCard'
import GuideAvatar from '../../components/GuideAvatar'
import { catalogStatusText, formatDate } from './shared'
import { inquiryWhenLabel } from '../../lib/inquiryLabels'

export function GuideOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['guide-dashboard'],
    queryFn: () => guideApi.dashboard(),
  })
  const inbox = useQuery({
    queryKey: ['guide-inquiries', 'new'],
    queryFn: () => inquiriesApi.guideInbox('new'),
  })
  const agenda = useQuery({
    queryKey: ['guide-agenda'],
    queryFn: () => inquiriesApi.agenda(),
  })

  if (isLoading) return <div className="card text-sm text-stone-500">Завантаження…</div>
  if (!data) return null

  const checklist = [
    { label: 'Фото профілю', done: !!data.avatar_url, link: '/account/guide/profile' },
    { label: 'Опублікована екскурсія', done: data.excursions.published > 0, link: '/account/guide/excursions' },
    { label: 'Розміщення в каталозі', done: !!data.subscription_expires, link: '/account/guide/billing' },
    { label: 'Слоти в календарі', done: data.slots_upcoming > 0, link: '/account/guide/calendar' },
  ]
  const pending = inbox.data?.items ?? []
  const meetings = agenda.data?.items ?? []

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4">
        <GuideAvatar avatar={data.avatar_url} name={data.display_name} className="h-16 w-16 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">{data.display_name || 'Ваш профіль'}</h2>
          <p className="text-sm text-stone-600">
            Статус: {data.status} · Каталог: {catalogStatusText(data.catalog_status)}
          </p>
          {data.website_slug && (
            <Link to={`/guide/${data.website_slug}`} className="mt-1 inline-block text-sm text-teal hover:underline">
              Переглянути публічний профіль →
            </Link>
          )}
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <p className="text-sm text-stone-500">Заповненість профілю</p>
          <p className="font-display text-3xl font-bold text-teal">{data.profile_complete}%</p>
        </div>
      </div>

      <StatGrid cols={4}>
        <StatCard label="Нові заявки" value={pending.length} tone={pending.length ? 'amber' : 'default'} />
        <StatCard label="Найближчі дати" value={meetings.length} hint="з заявок" tone="teal" />
        <StatCard label="Екскурсії" value={data.excursions.total} hint={`${data.excursions.published} опубл.`} tone="brand" />
        <StatCard label="Відгуки" value={data.rating_count} hint={data.rating_count ? `★ ${data.rating_avg.toFixed(1)}` : 'Ще немає'} />
      </StatGrid>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Потребують відповіді</h3>
          <Link to="/account/guide/inquiries" className="text-sm text-teal hover:underline">Усі заявки</Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">Немає нових запитів. Тут з’являться заявки туристів.</p>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 5).map((inq) => (
              <li key={inq.id}>
                <Link to={`/account/guide/inquiries/${inq.id}`} className="flex justify-between rounded-xl bg-sand-50 px-3 py-2 text-sm hover:bg-sand-100">
                  <span>{inq.tourist_name} · {inq.excursion_title || 'заявка'}</span>
                  <span className="text-stone-500">{inquiryWhenLabel(inq)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Найближчі дати із заявок</h3>
          <Link to="/account/guide/calendar" className="text-sm text-teal hover:underline">Календар</Link>
        </div>
        {meetings.length === 0 ? (
          <p className="text-sm text-stone-500">Немає заявок із датою. Календар доступності лишається окремо.</p>
        ) : (
          <ul className="space-y-2">
            {meetings.slice(0, 6).map((inq) => (
              <li key={inq.id}>
                <Link to={`/account/guide/inquiries/${inq.id}`} className="flex justify-between rounded-xl bg-sand-50 px-3 py-2 text-sm hover:bg-sand-100">
                  <span>{inquiryWhenLabel(inq)} · {inq.tourist_name}</span>
                  <span className="text-stone-500">{inq.party_size} ос.</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h3 className="font-semibold">Розміщення та оплати</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Профіль у каталозі</dt>
              <dd className="font-medium">{data.payments_enabled ? formatDate(data.subscription_expires) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Гіди за покликанням</dt>
              <dd className="font-medium">{data.payments_enabled ? formatDate(data.featured_guide_expires) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Просування екскурсій</dt>
              <dd className="font-medium">{data.featured_excursions_count} активних</dd>
            </div>
          </dl>
          <Link to="/account/guide/billing" className="btn-secondary inline-flex text-sm">Керувати білінгом</Link>
        </section>

        <section className="card space-y-3">
          <h3 className="font-semibold">Чеклист для старту</h3>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link to={item.link} className="flex items-center justify-between rounded-xl bg-sand-50 px-4 py-3 text-sm transition hover:bg-sand-100">
                  <span>{item.label}</span>
                  <span className={item.done ? 'text-emerald-600' : 'text-amber-600'}>
                    {item.done ? '✓ Готово' : '→ Зробити'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
