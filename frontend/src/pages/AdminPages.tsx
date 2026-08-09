import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, api, type AdminAnalytics, type AdminPaymentRow } from '../api/client'
import StatCard, { StatGrid } from '../components/crm/StatCard'
import { useHasRole } from '../hooks/useAuth'
import { SiteContentEditor } from '../components/SiteContentEditor'
import { AdminGuidesEditor } from '../components/AdminGuidesEditor'
import { AdminExcursionsList, AdminGuidesList, AdminReviewsList, AdminUsersList } from '../components/AdminEntityLists'
import { ArticlesEditor } from '../components/ArticlesEditor'
import { formatPrice } from '../components/excursionUi'

type AdminTab = 'analytics' | 'users' | 'guides' | 'excursions' | 'reviews' | 'settings' | 'content' | 'journal'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'analytics', label: 'Аналітика' },
  { id: 'users', label: 'Користувачі' },
  { id: 'guides', label: 'Гіди' },
  { id: 'excursions', label: 'Екскурсії' },
  { id: 'reviews', label: 'Відгуки' },
  { id: 'settings', label: 'Налаштування' },
  { id: 'content', label: 'Контент сайту' },
  { id: 'journal', label: 'Журнал' },
]

export default function AdminPage() {
  const isAdmin = useHasRole('ROLE_ADMIN')
  const qc = useQueryClient()
  const [tab, setTab] = useState<AdminTab>('analytics')
  const [guidesFilter, setGuidesFilter] = useState<string | undefined>()

  const { data: analytics, isError: analyticsError, error: analyticsErr } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.analytics(),
    enabled: isAdmin,
    retry: false,
  })
  const { data: settings, isError: settingsError, error: settingsErr } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.settings(),
    enabled: isAdmin,
    retry: false,
  })

  const updateSetting = async (patch: Partial<{ guide_placement_payments_enabled: boolean; moderation_enabled: boolean }>) => {
    await adminApi.updateSettings(patch)
    qc.invalidateQueries({ queryKey: ['settings'] })
  }

  const loadError = analyticsError || settingsError
  const errorMessage = (analyticsErr ?? settingsErr)?.message

  return (
    <>
      <Helmet><title>Адмін — аналітика</title></Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Адмін-панель</h1>
          <p className="mt-1 text-sm text-stone-600">Аналітика платформи, оплати та керування контентом</p>
        </div>

        <nav className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === 'guides') setGuidesFilter(undefined)
                setTab(t.id)
              }}
              className={tab === t.id
                ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
                : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-sand-100'}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Не вдалося завантажити дані: {errorMessage ?? 'помилка API'}
          </div>
        )}

        {tab === 'analytics' && analytics && (
          <AnalyticsDashboard
            data={analytics}
            onOpenUsers={() => setTab('users')}
            onOpenGuides={() => { setGuidesFilter('ACTIVE'); setTab('guides') }}
            onOpenExcursions={() => setTab('excursions')}
            onOpenReviews={() => setTab('reviews')}
          />
        )}

        {tab === 'users' && <AdminUsersList />}
        {tab === 'guides' && (
          <div className="space-y-4">
            <AdminGuidesList statusFilter={guidesFilter} />
            <AdminGuidesEditor />
          </div>
        )}
        {tab === 'excursions' && <AdminExcursionsList />}
        {tab === 'reviews' && <AdminReviewsList />}

        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="card">
              <p className="font-semibold">Модерація контенту</p>
              <p className="mt-1 text-sm text-stone-600">
                {settings?.moderation_enabled
                  ? 'Увімкнено — екскурсії та відгуки проходять перевірку модератором'
                  : 'Вимкнено — екскурсії та відгуки публікуються одразу'}
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={!settings}
                onClick={() => updateSetting({ moderation_enabled: !settings?.moderation_enabled })}
              >
                {settings?.moderation_enabled ? 'Вимкнути модерацію' : 'Увімкнути модерацію'}
              </button>
            </div>

            <div className="card">
              <p className="font-semibold">Оплата розміщення</p>
              <p className="mt-1 text-sm text-stone-600">
                {settings?.guide_placement_payments_enabled
                  ? 'Увімкнено — гіди оплачують профіль, блок «Гіди за покликанням» та «Популярні екскурсії»'
                  : 'Вимкнено — дати оплати в кабінеті показуються як «—», на головній випадкове розміщення'}
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={!settings}
                onClick={() => updateSetting({ guide_placement_payments_enabled: !settings?.guide_placement_payments_enabled })}
              >
                {settings?.guide_placement_payments_enabled ? 'Вимкнути оплату' : 'Увімкнути оплату'}
              </button>
            </div>
          </div>
        )}

        {tab === 'content' && <SiteContentEditor />}
        {tab === 'journal' && <ArticlesEditor apiBase="admin" />}
      </div>
    </>
  )
}

function AnalyticsDashboard({
  data,
  onOpenUsers,
  onOpenGuides,
  onOpenExcursions,
  onOpenReviews,
}: {
  data: AdminAnalytics
  onOpenUsers: () => void
  onOpenGuides: () => void
  onOpenExcursions: () => void
  onOpenReviews: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Огляд платформи</h2>
        <StatGrid cols={4}>
          <StatCard label="Користувачі" value={data.total_users} hint={`${data.total_guides} гідів`} tone="brand" onClick={onOpenUsers} />
          <StatCard label="Активні гіди" value={data.active_guides} tone="teal" onClick={onOpenGuides} />
          <StatCard label="Екскурсії" value={data.published_excursions} hint={`${data.pending_moderation_excursions} на модерації`} onClick={onOpenExcursions} />
          <StatCard label="Відгуки" value={data.published_reviews} hint={`${data.pending_reviews} очікують`} onClick={onOpenReviews} />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Фінанси та оплати</h2>
        <StatGrid cols={4}>
          <StatCard
            label="Дохід загалом"
            value={formatMoney(data.revenue_total)}
            hint={`${formatMoney(data.revenue_month)} цього місяця`}
            tone="brand"
          />
          <StatCard label="Оплат успішних" value={data.payments_paid} hint={`з ${data.payments_total}`} tone="teal" />
          <StatCard label="Очікують оплати" value={data.payments_pending} tone={data.payments_pending ? 'amber' : 'default'} />
          <StatCard label="Активні підписки" value={data.active_subscriptions} />
        </StatGrid>
        <StatGrid cols={3}>
          <StatCard label="Просування гідів" value={data.featured_guides_active} />
          <StatCard label="Просування екскурсій" value={data.featured_excursions_active} />
          <StatCard label="Обране (всього)" value={data.total_favorites} hint="збережень туристами" />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Контент та чернетки</h2>
        <StatGrid cols={4}>
          <StatCard label="Чернетки екскурсій" value={data.draft_excursions} />
          <StatCard label="На модерації" value={data.pending_moderation_excursions} tone={data.pending_moderation_excursions ? 'amber' : 'default'} />
          <StatCard label="Міст" value={data.cities_count} hint={`${data.countries_count} країн`} />
          <StatCard label="Відгуки очікують" value={data.pending_reviews} tone={data.pending_reviews ? 'amber' : 'default'} />
        </StatGrid>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-divider px-4 py-3">
          <h2 className="font-display text-lg font-bold">Останні платежі</h2>
        </div>
        {(data.recent_payments ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500">Платежів поки немає</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Гід</th>
                  <th className="px-4 py-2 font-medium">Призначення</th>
                  <th className="px-4 py-2 font-medium">Сума</th>
                  <th className="px-4 py-2 font-medium">Статус</th>
                  <th className="px-4 py-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function PaymentRow({ payment: p }: { payment: AdminPaymentRow }) {
  return (
    <tr className="border-b border-divider last:border-0">
      <td className="px-4 py-2.5">{p.id}</td>
      <td className="px-4 py-2.5 font-medium">{p.payer_name || '—'}</td>
      <td className="px-4 py-2.5">{purposeLabel(p.purpose)}</td>
      <td className="px-4 py-2.5">{formatPrice(p.amount, p.currency)}</td>
      <td className="px-4 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(p.status)}`}>
          {statusLabel(p.status)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-stone-500">
        {new Date(p.created_at).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  )
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(amount) + ' ₴'
}

function purposeLabel(purpose: string) {
  const map: Record<string, string> = {
    GUIDE_PLACEMENT: 'Розміщення профілю',
    FEATURED_GUIDE: 'Гіди за покликанням',
    FEATURED_EXCURSION: 'Популярні екскурсії',
  }
  return map[purpose] ?? purpose
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PAID: 'Оплачено',
    PENDING: 'Очікує',
    CREATED: 'Створено',
  }
  return map[status] ?? status
}

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700'
  if (status === 'PENDING' || status === 'CREATED') return 'bg-amber-50 text-amber-800'
  return 'bg-sand-100 text-stone-600'
}

export function ModeratorPage() {
  const isModerator = useHasRole('ROLE_MODERATOR')
  const [section, setSection] = useState<'excursions' | 'journal'>('excursions')
  const { data, isError, error } = useQuery({
    queryKey: ['mod-excursions'],
    queryFn: () => api<{ items: { id: number; title: string }[] }>('/api/v1/moderator/excursions'),
    enabled: isModerator && section === 'excursions',
    retry: false,
  })
  const approve = (id: number) => api(`/api/v1/moderator/excursions/${id}/approve`, { method: 'POST' })

  return (
    <>
      <Helmet><title>Модератор</title></Helmet>
      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('excursions')}
            className={section === 'excursions'
              ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
              : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-sand-100'}
          >
            Екскурсії
          </button>
          <button
            type="button"
            onClick={() => setSection('journal')}
            className={section === 'journal'
              ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
              : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-sand-100'}
          >
            Журнал
          </button>
        </nav>

        {section === 'journal' ? (
          <ArticlesEditor apiBase="moderator" />
        ) : (
          <div className="card">
            <h1 className="font-display mb-4 text-2xl font-bold">Модерація екскурсій</h1>
            {isError && (
              <p className="mb-4 text-sm text-red-600">{error?.message ?? 'Помилка завантаження'}</p>
            )}
            <ul className="space-y-2">
              {(data?.items ?? []).map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
                  <span>{e.title}</span>
                  <button type="button" className="btn-primary py-1 text-xs" onClick={() => approve(e.id)}>Схвалити</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
