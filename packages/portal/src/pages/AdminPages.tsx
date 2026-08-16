import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, api, type AdminAnalytics, type AdminPaymentRow, type CookieConsentRecord } from '@gaido/api-client/api/client'
import StatCard, { StatGrid } from '../components/crm/StatCard'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import { SiteContentEditor } from '../components/SiteContentEditor'
import { AdminGuidesEditor } from '../components/AdminGuidesEditor'
import { AdminExcursionsList, AdminGuidesList, AdminReviewsList, AdminUsersList } from '../components/AdminEntityLists'
import { ArticlesEditor } from '../components/ArticlesEditor'
import { formatPrice } from '../components/excursionUi'

type AdminTab = 'analytics' | 'users' | 'guides' | 'excursions' | 'reviews' | 'settings' | 'content' | 'journal' | 'audit' | 'cookies'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'analytics', label: 'Аналітика' },
  { id: 'users', label: 'Користувачі' },
  { id: 'guides', label: 'Гіди' },
  { id: 'excursions', label: 'Екскурсії' },
  { id: 'reviews', label: 'Відгуки' },
  { id: 'settings', label: 'Налаштування' },
  { id: 'content', label: 'Контент сайту' },
  { id: 'journal', label: 'Журнал' },
  { id: 'audit', label: 'Аудит' },
  { id: 'cookies', label: 'Cookie-згода' },
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
            <div className="flex flex-wrap gap-2">
              {[
                { id: undefined, label: 'Усі' },
                { id: 'DRAFT', label: 'Чернетки' },
                { id: 'WAITING_PAYMENT', label: 'Очікують' },
                { id: 'ACTIVE', label: 'Активні' },
              ].map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className={guidesFilter === f.id ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setGuidesFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
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
                  : 'Вимкнено — «На модерацію» одразу публікує; чернетки лишаються чернетками, поки гід їх не опублікує'}
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
              <p className="font-semibold">Монетизація (оплата розміщення / контакти / топ)</p>
              <p className="mt-1 text-sm text-stone-600">
                {settings?.guide_placement_payments_enabled
                  ? 'Увімкнено — контакти лише з активною підпискою; гіди оплачують розміщення та просування в топ'
                  : 'Вимкнено (режим наповнення) — контакти ACTIVE гідів відкриті; checkout не потрібен, доступний admin bypass'}
              </p>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={!settings}
                onClick={() => updateSetting({ guide_placement_payments_enabled: !settings?.guide_placement_payments_enabled })}
              >
                {settings?.guide_placement_payments_enabled ? 'Вимкнути монетизацію' : 'Увімкнути монетизацію'}
              </button>
            </div>

            <LoginRateLimitReset />
          </div>
        )}

        {tab === 'content' && <SiteContentEditor />}
        {tab === 'journal' && <ArticlesEditor apiBase="admin" />}
        {tab === 'audit' && <AdminAuditLog />}
        {tab === 'cookies' && <AdminCookieConsents />}
      </div>
    </>
  )
}

function LoginRateLimitReset() {
  const [login, setLogin] = useState('')
  const [ip, setIp] = useState('')
  const [message, setMessage] = useState('')
  const clear = useMutation({
    mutationFn: () => adminApi.clearLoginRateLimit({
      ...(login.trim() ? { login: login.trim() } : {}),
      ...(ip.trim() ? { ip: ip.trim() } : {}),
    }),
    onSuccess: (res) => {
      const parts: string[] = []
      if (login.trim()) parts.push(res.login_cleared ? 'логін знято' : 'логін не був заблокований')
      if (ip.trim()) parts.push(res.ip_cleared ? 'IP знято' : 'IP не був заблокований')
      setMessage(parts.join('; ') || 'Готово')
    },
    onError: (err: Error) => setMessage(err.message),
  })

  return (
    <div className="card">
      <p className="font-semibold">Блок входу (rate limit)</p>
      <p className="mt-1 text-sm text-stone-600">
        Зняти in-memory блок після невдалих спроб входу. Потрібен хоча б один параметр — логін або IP.
      </p>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!login.trim() && !ip.trim()) {
            setMessage('Вкажіть логін або IP')
            return
          }
          setMessage('')
          clear.mutate()
        }}
      >
        <input
          className="input"
          placeholder="Логін"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          className="input"
          placeholder="IP-адреса"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
        <button type="submit" className="btn-primary sm:col-span-2" disabled={clear.isPending}>
          Зняти блок
        </button>
      </form>
      {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}
    </div>
  )
}

function AdminAuditLog() {
  const { data, isError, error } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminApi.audit(),
  })
  return (
    <div className="card">
      <h2 className="font-display mb-4 text-xl font-bold">Журнал аудиту</h2>
      {isError && <p className="mb-3 text-sm text-red-600">{error?.message}</p>}
      <ul className="space-y-2 text-sm">
        {(data?.items ?? []).map((e) => (
          <li key={e.id} className="rounded-lg bg-sand-50 px-3 py-2">
            <span className="font-medium">{e.action}</span>
            <span className="text-muted"> · {e.entity_type}{e.entity_id != null ? `#${e.entity_id}` : ''}</span>
            <span className="block text-xs text-muted-light">{new Date(e.created_at).toLocaleString('uk-UA')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AdminCookieConsents() {
  const { data, isError, error, isLoading } = useQuery({
    queryKey: ['admin-cookie-consents'],
    queryFn: () => adminApi.cookieConsents(),
  })

  return (
    <div className="card">
      <h2 className="font-display mb-2 text-xl font-bold">Згода на cookie</h2>
      <p className="mb-4 text-sm text-muted">
        Записи про прийняття cookie-банера: IP, браузер, мова, сторінка та інші дані клієнта.
      </p>
      {isLoading && <p className="text-sm text-muted">Завантаження…</p>}
      {isError && <p className="mb-3 text-sm text-red-600">{error?.message}</p>}
      {(data?.items ?? []).length === 0 && !isLoading ? (
        <p className="text-sm text-muted">Поки немає записів.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-light">
                <th className="px-2 py-2">Дата</th>
                <th className="px-2 py-2">IP</th>
                <th className="px-2 py-2">Браузер</th>
                <th className="px-2 py-2">Мова</th>
                <th className="px-2 py-2">Сторінка</th>
                <th className="px-2 py-2">Деталі</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <CookieConsentRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CookieConsentRow({ row }: { row: CookieConsentRecord }) {
  const browserShort = row.user_agent.length > 80 ? `${row.user_agent.slice(0, 80)}…` : row.user_agent
  const pageShort = row.page_url && row.page_url.length > 48 ? `${row.page_url.slice(0, 48)}…` : row.page_url
  const info = row.browser_info
  const details = info
    ? `${info.platform} · ${info.timezone} · ${info.viewport.width}×${info.viewport.height}`
    : '—'

  return (
    <tr className="border-b border-divider align-top">
      <td className="whitespace-nowrap px-2 py-2 text-xs text-muted">
        {new Date(row.created_at).toLocaleString('uk-UA')}
      </td>
      <td className="px-2 py-2 font-mono text-xs">{row.ip}</td>
      <td className="max-w-[220px] px-2 py-2 text-xs" title={row.user_agent}>{browserShort}</td>
      <td className="px-2 py-2 text-xs">{row.accept_language || info?.language || '—'}</td>
      <td className="max-w-[180px] px-2 py-2 text-xs" title={row.page_url}>{pageShort || '—'}</td>
      <td className="px-2 py-2 text-xs text-muted">{details}</td>
    </tr>
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

type ModSection = 'excursions' | 'reviews' | 'documents' | 'geo' | 'journal'

export function ModeratorPage() {
  const isModerator = useHasRole('ROLE_MODERATOR')
  const qc = useQueryClient()
  const [section, setSection] = useState<ModSection>('excursions')

  const { data: excursions, isError: excErr, error: excError } = useQuery({
    queryKey: ['mod-excursions'],
    queryFn: () => api<{ items: { id: number; title: string }[] }>('/api/v1/moderator/excursions'),
    enabled: isModerator && section === 'excursions',
    retry: false,
  })
  const { data: reviews } = useQuery({
    queryKey: ['mod-reviews'],
    queryFn: () => api<{ items: { id: number; text: string; rating: number; author_name?: string }[] }>('/api/v1/moderator/reviews'),
    enabled: isModerator && section === 'reviews',
  })
  const { data: documents } = useQuery({
    queryKey: ['mod-documents'],
    queryFn: () => api<{ items: { id: number; guide_id: number; type: string; guide_name?: string }[] }>('/api/v1/moderator/documents'),
    enabled: isModerator && section === 'documents',
  })
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => api<{ items: { id: number; slug: string; name: string }[] }>('/api/v1/geo/countries'),
    enabled: isModerator && section === 'geo',
  })

  const [geoCountry, setGeoCountry] = useState({ slug: '', name: '' })
  const [geoRegion, setGeoRegion] = useState({ country_id: 0, slug: '', name: '' })
  const [geoCity, setGeoCity] = useState({ country_id: 0, region_id: 0, slug: '', name: '', latitude: 0, longitude: 0 })
  const [geoMsg, setGeoMsg] = useState('')

  const sections: { id: ModSection; label: string }[] = [
    { id: 'excursions', label: 'Екскурсії' },
    { id: 'reviews', label: 'Відгуки' },
    { id: 'documents', label: 'Документи' },
    { id: 'geo', label: 'Гео' },
    { id: 'journal', label: 'Журнал' },
  ]

  const refreshExc = () => qc.invalidateQueries({ queryKey: ['mod-excursions'] })
  const refreshRev = () => qc.invalidateQueries({ queryKey: ['mod-reviews'] })

  return (
    <>
      <Helmet><title>Модератор</title></Helmet>
      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={section === s.id
                ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
                : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-sand-100'}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {section === 'journal' && <ArticlesEditor apiBase="moderator" />}

        {section === 'excursions' && (
          <div className="card">
            <h1 className="font-display mb-4 text-2xl font-bold">Модерація екскурсій</h1>
            {excErr && <p className="mb-4 text-sm text-red-600">{excError?.message ?? 'Помилка завантаження'}</p>}
            <ul className="space-y-2">
              {(excursions?.items ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sand-50 px-3 py-2">
                  <span>{e.title}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary py-1 text-xs"
                      onClick={async () => { await adminApi.approveExcursion(e.id); refreshExc() }}
                    >
                      Схвалити
                    </button>
                    <button
                      type="button"
                      className="btn-secondary py-1 text-xs"
                      onClick={async () => { await adminApi.rejectExcursion(e.id); refreshExc() }}
                    >
                      Відхилити
                    </button>
                  </div>
                </li>
              ))}
              {(excursions?.items ?? []).length === 0 && !excErr && (
                <p className="text-sm text-muted">Черга порожня</p>
              )}
            </ul>
          </div>
        )}

        {section === 'reviews' && (
          <div className="card">
            <h1 className="font-display mb-4 text-2xl font-bold">Модерація відгуків</h1>
            <ul className="space-y-2">
              {(reviews?.items ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sand-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.author_name ?? `Автор #${r.id}`} · {r.rating}/5</p>
                    <p className="text-sm text-muted">{r.text}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary py-1 text-xs"
                    onClick={async () => { await adminApi.approveReview(r.id); refreshRev() }}
                  >
                    Схвалити
                  </button>
                </li>
              ))}
              {(reviews?.items ?? []).length === 0 && <p className="text-sm text-muted">Немає відгуків на перевірку</p>}
            </ul>
          </div>
        )}

        {section === 'documents' && (
          <div className="card">
            <h1 className="font-display mb-4 text-2xl font-bold">Документи гідів</h1>
            <ul className="space-y-2 text-sm">
              {(documents?.items ?? []).map((d) => (
                <li key={d.id} className="rounded-lg bg-sand-50 px-3 py-2">
                  #{d.id} · гід {d.guide_name ?? d.guide_id} · {d.type}
                </li>
              ))}
              {(documents?.items ?? []).length === 0 && <p className="text-muted">Немає завантажених документів</p>}
            </ul>
          </div>
        )}

        {section === 'geo' && (
          <div className="card space-y-6">
            <h1 className="font-display text-2xl font-bold">Географія</h1>
            {geoMsg && <p className="text-sm text-muted">{geoMsg}</p>}

            <form
              className="grid gap-2 sm:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault()
                await adminApi.createCountry(geoCountry)
                setGeoMsg(`Країну «${geoCountry.name}» додано`)
                setGeoCountry({ slug: '', name: '' })
                qc.invalidateQueries({ queryKey: ['countries'] })
              }}
            >
              <p className="sm:col-span-3 font-medium">Країна</p>
              <input className="input" placeholder="slug" value={geoCountry.slug} onChange={(e) => setGeoCountry({ ...geoCountry, slug: e.target.value })} required />
              <input className="input" placeholder="Назва" value={geoCountry.name} onChange={(e) => setGeoCountry({ ...geoCountry, name: e.target.value })} required />
              <button type="submit" className="btn-secondary">Додати країну</button>
            </form>

            <form
              className="grid gap-2 sm:grid-cols-4"
              onSubmit={async (e) => {
                e.preventDefault()
                await adminApi.createRegion(geoRegion)
                setGeoMsg(`Регіон «${geoRegion.name}» додано`)
                setGeoRegion({ country_id: 0, slug: '', name: '' })
              }}
            >
              <p className="sm:col-span-4 font-medium">Регіон</p>
              <select
                className="input"
                value={geoRegion.country_id || ''}
                onChange={(e) => setGeoRegion({ ...geoRegion, country_id: Number(e.target.value) })}
                required
              >
                <option value="">Країна</option>
                {(countries?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input className="input" placeholder="slug" value={geoRegion.slug} onChange={(e) => setGeoRegion({ ...geoRegion, slug: e.target.value })} required />
              <input className="input" placeholder="Назва" value={geoRegion.name} onChange={(e) => setGeoRegion({ ...geoRegion, name: e.target.value })} required />
              <button type="submit" className="btn-secondary">Додати регіон</button>
            </form>

            <form
              className="grid gap-2 sm:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault()
                await adminApi.createCity(geoCity)
                setGeoMsg(`Місто «${geoCity.name}» додано`)
                setGeoCity({ country_id: 0, region_id: 0, slug: '', name: '', latitude: 0, longitude: 0 })
              }}
            >
              <p className="sm:col-span-3 font-medium">Місто</p>
              <select
                className="input"
                value={geoCity.country_id || ''}
                onChange={(e) => setGeoCity({ ...geoCity, country_id: Number(e.target.value) })}
                required
              >
                <option value="">Країна</option>
                {(countries?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input className="input" type="number" placeholder="region_id" value={geoCity.region_id || ''} onChange={(e) => setGeoCity({ ...geoCity, region_id: Number(e.target.value) })} required />
              <input className="input" placeholder="slug" value={geoCity.slug} onChange={(e) => setGeoCity({ ...geoCity, slug: e.target.value })} required />
              <input className="input" placeholder="Назва" value={geoCity.name} onChange={(e) => setGeoCity({ ...geoCity, name: e.target.value })} required />
              <input className="input" type="number" step="any" placeholder="lat" value={geoCity.latitude || ''} onChange={(e) => setGeoCity({ ...geoCity, latitude: Number(e.target.value) })} />
              <input className="input" type="number" step="any" placeholder="lng" value={geoCity.longitude || ''} onChange={(e) => setGeoCity({ ...geoCity, longitude: Number(e.target.value) })} />
              <button type="submit" className="btn-secondary sm:col-span-3">Додати місто</button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
