import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, billingApi, guideApi } from '../api/client'
import StatCard, { StatGrid } from '../components/crm/StatCard'
import {
  type ExcursionItem,
  excursionStatusLabel,
  excursionTypeLabel,
  formatPrice,
  statusTone,
} from '../components/excursionUi'
import GuideAvatar from '../components/GuideAvatar'
import { ImageUrlField } from '../components/ImageUrlField'

type GuideProfile = {
  id: number
  guide_type: string
  display_name: string
  about: string
  avatar_url?: string
  phone: string
  email: string
  telegram: string
  whatsapp: string
  status: string
  type_badge?: string
  has_license: boolean
  catalog_status: 'companion' | 'confirmed' | 'pending'
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function GuideOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['guide-dashboard'],
    queryFn: () => guideApi.dashboard(),
  })

  if (isLoading) return <div className="card text-sm text-stone-500">Завантаження…</div>
  if (!data) return null

  const checklist = [
    { label: 'Фото профілю', done: !!data.avatar_url, link: '/account/guide/profile' },
    { label: 'Опублікована екскурсія', done: data.excursions.published > 0, link: '/account/guide/excursions' },
    { label: 'Розміщення в каталозі', done: !!data.subscription_expires, link: '/account/guide/billing' },
    { label: 'Слоти в календарі', done: data.slots_upcoming > 0, link: '/account/guide/calendar' },
  ]

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
            <Link to={`/guide/${data.website_slug}`} className="mt-1 inline-block text-sm text-brand-700 hover:underline">
              Переглянути публічний профіль →
            </Link>
          )}
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <p className="text-sm text-stone-500">Заповненість профілю</p>
          <p className="font-display text-3xl font-bold text-brand-700">{data.profile_complete}%</p>
        </div>
      </div>

      <StatGrid cols={4}>
        <StatCard label="Екскурсії" value={data.excursions.total} hint={`${data.excursions.published} опубл.`} tone="brand" />
        <StatCard label="На модерації" value={data.excursions.pending} tone={data.excursions.pending ? 'amber' : 'default'} />
        <StatCard label="Відгуки" value={data.rating_count} hint={data.rating_count ? `★ ${data.rating_avg.toFixed(1)}` : 'Ще немає'} tone="teal" />
        <StatCard label="Слоти" value={data.slots_upcoming} hint="майбутні" />
      </StatGrid>

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
          <h3 className="font-semibold">Швидкі дії</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/account/guide/excursions/new" className="rounded-xl border border-border px-3 py-3 text-sm transition hover:bg-sand-50">
              + Нова екскурсія
            </Link>
            <Link to="/account/guide/profile" className="rounded-xl border border-border px-3 py-3 text-sm transition hover:bg-sand-50">
              Редагувати профіль
            </Link>
            <Link to="/account/guide/documents" className="rounded-xl border border-border px-3 py-3 text-sm transition hover:bg-sand-50">
              Документи
            </Link>
            <Link to="/account/guide/calendar" className="rounded-xl border border-border px-3 py-3 text-sm transition hover:bg-sand-50">
              Календар
            </Link>
          </div>
        </section>
      </div>

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
  )
}

function catalogStatusText(status: string) {
  if (status === 'companion') return 'Компаньйон'
  if (status === 'confirmed') return 'Підтверджено'
  if (status === 'pending') return 'Без бейджа'
  return status
}

export function GuideProfilePage() {
  return <GuideProfileForm />
}

function GuideProfileForm() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const [form, setForm] = useState<Partial<GuideProfile>>({})
  const mutation = useMutation({
    mutationFn: (body: Partial<GuideProfile>) =>
      api('/api/v1/account/guide/profile', { method: 'PUT', body: JSON.stringify({ ...data, ...body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guide-profile'] }),
  })

  const f = { ...data, ...form }
  const isCompanion = f.guide_type === 'COMPANION'

  return (
    <div className="card space-y-3">
      <h2 className="font-display text-xl font-bold">Профіль</h2>
      <p className="text-sm text-stone-500">Статус профілю: {f.status}</p>
      <CatalogStatusBanner profile={f} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isCompanion}
          onChange={(e) => setForm({ guide_type: e.target.checked ? 'COMPANION' : 'GUIDE' })}
        />
        Я компаньйон (ліцензія не потрібна)
      </label>
      {!isCompanion && (
        <p className="text-xs text-stone-500">
          Тип «Гід» або «Конферансьє» визначається завантаженою ліцензією в розділі{' '}
          <Link to="/account/guide/documents" className="text-brand-700 hover:underline">Документи</Link>.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <GuideAvatar avatar={f.avatar_url} name={f.display_name} className="h-24 w-24 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <ImageUrlField
            label="Фото профілю"
            value={f.avatar_url ?? ''}
            cropAspect={1}
            outputFormat="webp"
            maxBytes={150 * 1024}
            onChange={(avatar_url) => setForm({ avatar_url })}
          />
        </div>
      </div>
      <input className="input" placeholder="Ім&apos;я для відображення" defaultValue={f.display_name} onChange={(e) => setForm({ display_name: e.target.value })} />
      <textarea className="input min-h-24" placeholder="Про себе" defaultValue={f.about} onChange={(e) => setForm({ about: e.target.value })} />
      <input className="input" placeholder="Телефон" defaultValue={f.phone} onChange={(e) => setForm({ phone: e.target.value })} />
      <input className="input" placeholder="Telegram" defaultValue={f.telegram} onChange={(e) => setForm({ telegram: e.target.value })} />
      <button type="button" className="btn-primary" onClick={() => mutation.mutate(form)}>Зберегти</button>
    </div>
  )
}

export function GuideBillingPage() {
  const qc = useQueryClient()
  const [selectedExcursion, setSelectedExcursion] = useState<number | ''>('')
  const [busy, setBusy] = useState<number | null>(null)

  const { data: status } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => billingApi.status(),
  })
  const { data: plans } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => billingApi.plans(),
  })
  const { data: excursions } = useQuery({
    queryKey: ['guide-excursions-account'],
    queryFn: () => api<{ items: ExcursionItem[] }>('/api/v1/account/guide/excursions'),
  })

  const placementPlans = (plans?.items ?? []).filter((p) => p.plan_type === 'GUIDE_PLACEMENT')
  const featuredGuidePlans = (plans?.items ?? []).filter((p) => p.plan_type === 'FEATURED_GUIDE')
  const featuredExcursionPlans = (plans?.items ?? []).filter((p) => p.plan_type === 'FEATURED_EXCURSION')
  const publishedExcursions = (excursions?.items ?? []).filter((e) => e.status === 'PUBLISHED')

  const checkout = async (planId: number, excursionId?: number) => {
    setBusy(planId)
    try {
      const res = await billingApi.checkout({ plan_id: planId, excursion_id: excursionId })
      await billingApi.confirm(res.payment_id, planId)
      qc.invalidateQueries({ queryKey: ['billing-status'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      alert('Оплату підтверджено (stub). Розміщення активовано.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка оплати')
    } finally {
      setBusy(null)
    }
  }

  const paymentsEnabled = status?.payments_enabled ?? true

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Розміщення та просування</h2>
        <p className="mt-2 text-sm text-stone-600">
          Оплата помісячно за профіль. Окремо — просування на головній у блоках «Гіди за покликанням» та «Популярні екскурсії».
        </p>
        {!paymentsEnabled && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Оплата вимкнена адміністратором — дати дієності показуються як «—». Розміщення на головній — у випадковому порядку.
          </p>
        )}
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Базове розміщення профілю</h2>
        <p className="text-sm text-stone-600">Потрібно для відображення контактів у каталозі. Оплата помісячно.</p>
        <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
          <span className="text-stone-500">Оплачено до: </span>
          <span className="font-medium">{formatPaidUntil(status?.subscription?.expires_at, paymentsEnabled)}</span>
        </div>
        {paymentsEnabled && (
          <PlanButtons plans={placementPlans} busy={busy} onPay={(id) => checkout(id)} />
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Гіди за покликанням</h2>
        <p className="text-sm text-stone-600">Просування вашого профілю на головній сторінці. Спочатку показуються оплачені гіди.</p>
        <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
          <span className="text-stone-500">Оплачено до: </span>
          <span className="font-medium">{formatPaidUntil(status?.featured_guide?.expires_at, paymentsEnabled)}</span>
        </div>
        {paymentsEnabled && (
          <PlanButtons plans={featuredGuidePlans} busy={busy} onPay={(id) => checkout(id)} periodLabels />
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Популярні екскурсії</h2>
        <p className="text-sm text-stone-600">Просування обраної екскурсії на головній. Спочатку — оплачені, решта — випадково.</p>

        {(status?.featured_excursions ?? []).length > 0 && (
          <ul className="space-y-2 text-sm">
            {status!.featured_excursions.map((item) => (
              <li key={`${item.excursion_id}-${item.expires_at}`} className="rounded-xl bg-sand-50 px-4 py-3">
                <span className="font-medium">{item.excursion_title ?? 'Екскурсія'}</span>
                <span className="text-stone-500"> · до {formatPaidUntil(item.expires_at, paymentsEnabled)}</span>
              </li>
            ))}
          </ul>
        )}

        {paymentsEnabled && (
          <>
            <label className="block text-sm text-stone-600">
              Екскурсія для просування
              <select
                className="input mt-1"
                value={selectedExcursion}
                onChange={(e) => setSelectedExcursion(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Оберіть опубліковану екскурсію</option>
                {publishedExcursions.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </label>
            {publishedExcursions.length === 0 && (
              <p className="text-sm text-stone-500">Спочатку опублікуйте екскурсію в розділі «Екскурсії».</p>
            )}
            <PlanButtons
              plans={featuredExcursionPlans}
              busy={busy}
              disabled={!selectedExcursion}
              periodLabels
              onPay={(id) => checkout(id, Number(selectedExcursion))}
            />
          </>
        )}
      </section>
    </div>
  )
}

function formatPaidUntil(iso?: string, paymentsEnabled = true) {
  if (!paymentsEnabled) return '—'
  if (!iso) return 'Не оплачено'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function planPeriodLabel(days: number) {
  if (days <= 7) return 'Тиждень'
  if (days <= 31) return 'Місяць'
  return 'Рік'
}

function PlanButtons({
  plans,
  busy,
  onPay,
  disabled,
  periodLabels,
}: {
  plans: Array<{ id: number; name: string; price: number; currency: string; duration_days: number }>
  busy: number | null
  onPay: (planId: number) => void
  disabled?: boolean
  periodLabels?: boolean
}) {
  if (plans.length === 0) return <p className="text-sm text-stone-500">Тарифи недоступні</p>
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border border-stone-200 p-4">
          <p className="font-semibold">{periodLabels ? planPeriodLabel(p.duration_days) : p.name}</p>
          <p className="mt-1 text-sm text-stone-500">{formatPrice(p.price, p.currency)}</p>
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={disabled || busy === p.id}
            onClick={() => onPay(p.id)}
          >
            {busy === p.id ? 'Оплата…' : 'Оплатити (stub)'}
          </button>
        </div>
      ))}
    </div>
  )
}

export function GuideDocumentsPage() {
  const qc = useQueryClient()
  const { data: profile } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const { data: docs } = useQuery({
    queryKey: ['guide-documents'],
    queryFn: () => api<{ items: GuideDocument[] }>('/api/v1/account/guide/documents'),
  })

  const items = docs?.items ?? []
  const isCompanion = profile?.guide_type === 'COMPANION'
  const guideDoc = items.find((d) => d.type === 'GUIDE_LICENSE')
  const entertainerDoc = items.find((d) => d.type === 'ENTERTAINER_LICENSE')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guide-documents'] })
    qc.invalidateQueries({ queryKey: ['guide-profile'] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Документи</h2>
        <p className="mt-2 text-sm text-stone-600">
          Завантажте ліцензію — від цього залежить тип і бейдж у каталозі. Не блокує оплату та публікацію екскурсій.
        </p>
      </div>

      {profile && <CatalogStatusBanner profile={profile} />}

      {isCompanion ? (
        <div className="card">
          <h2 className="font-semibold">Компаньйон</h2>
          <p className="mt-2 text-sm text-stone-600">
            Для компаньйона ліцензія не потрібна — бейдж «Компаньйон» відображається автоматично.
            Щоб стати гідом або конферансьє, зніміть позначку «Компаньйон» у профілі.
          </p>
        </div>
      ) : (
        <>
          <GuideLicenseForm document={guideDoc} active={!!guideDoc} onUploaded={invalidate} />
          <EntertainerLicenseForm document={entertainerDoc} active={!!entertainerDoc} onUploaded={invalidate} />
        </>
      )}
    </div>
  )
}

function CatalogStatusBanner({ profile }: { profile: Partial<GuideProfile> }) {
  const label = catalogStatusLabel(profile)
  const tone =
    profile.catalog_status === 'confirmed' || profile.catalog_status === 'companion'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-900'

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-medium">Статус у каталозі: {label}</p>
      {profile.catalog_status === 'pending' && (
        <p className="mt-1 opacity-90">Завантажте ліцензію гіда або конферансьє — бейдж з&apos;явиться після завантаження.</p>
      )}
    </div>
  )
}

function catalogStatusLabel(profile: Partial<GuideProfile>) {
  if (profile.catalog_status === 'companion') return 'Компаньйон'
  if (profile.type_badge) return profile.type_badge
  if (profile.catalog_status === 'pending') return 'Без бейджа'
  return 'Не визначено'
}

type GuideDocument = {
  id: number
  type: string
  mime_type: string
  size: number
}

function DocumentUploadForm({
  title,
  description,
  docType,
  document,
  active,
  onUploaded,
}: {
  title: string
  description: string
  docType: 'GUIDE_LICENSE' | 'ENTERTAINER_LICENSE'
  document?: GuideDocument
  active?: boolean
  onUploaded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', docType)
      await api('/api/v1/account/guide/documents', { method: 'POST', body: fd })
      setFile(null)
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`card space-y-4 ${active ? 'ring-2 ring-brand-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
        {active && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            Активний статус
          </span>
        )}
      </div>

      {document ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Завантажено: {formatSize(document.size)} · {document.mime_type}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Документ ще не завантажено.</p>
      )}

      <div className="space-y-2">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-stone-500">PDF, JPG або PNG, до 10 МБ</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="button" className="btn-primary" disabled={!file || loading} onClick={upload}>
        {loading ? 'Завантаження…' : document ? 'Замінити документ' : 'Завантажити'}
      </button>
    </div>
  )
}

function GuideLicenseForm(props: { document?: GuideDocument; active?: boolean; onUploaded: () => void }) {
  return (
    <DocumentUploadForm
      title="Ліцензія гіда"
      description="Після завантаження в каталозі відображається бейдж «Гід»."
      docType="GUIDE_LICENSE"
      {...props}
    />
  )
}

function EntertainerLicenseForm(props: { document?: GuideDocument; active?: boolean; onUploaded: () => void }) {
  return (
    <DocumentUploadForm
      title="Ліцензія конферансьє"
      description="Після завантаження в каталозі відображається бейдж «Конферансьє»."
      docType="ENTERTAINER_LICENSE"
      {...props}
    />
  )
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function GuideExcursionsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-excursions'],
    queryFn: () => api<{ items: ExcursionItem[]; moderation_enabled: boolean }>('/api/v1/account/guide/excursions'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-excursions'] })

  const submit = useMutation({
    mutationFn: (id: number) => api(`/api/v1/account/guide/excursions/${id}/submit`, { method: 'POST' }),
    onSuccess: invalidate,
  })
  const toDraft = useMutation({
    mutationFn: (id: number) => api(`/api/v1/account/guide/excursions/${id}/draft`, { method: 'POST' }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/v1/account/guide/excursions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const items = data?.items ?? []
  const moderationEnabled = data?.moderation_enabled ?? true

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Мої екскурсії</h2>
        <Link to="/account/guide/excursions/new" className="btn-primary">Створити</Link>
      </div>

      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
      {isError && <div className="card text-sm text-red-600">{error?.message ?? 'Помилка завантаження'}</div>}
      {!isLoading && !isError && items.length === 0 && (
        <div className="card text-sm text-stone-500">Екскурсій поки немає. Створіть першу.</div>
      )}

      <div className="grid gap-4">
        {items.map((e) => (
          <article key={e.id} className="card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold">{e.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(e.status)}`}>
                  {excursionStatusLabel(e.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {e.city_name || 'Місто не вказано'} · {excursionTypeLabel(e.type)} · до {e.max_guests} ос.
              </p>
              <p className="mt-2 font-semibold text-brand-700">{formatPrice(e.price_from, e.currency)}</p>
              {e.status === 'PUBLISHED' && (
                <Link to={`/excursion/${e.slug}`} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
                  Переглянути в каталозі →
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/account/guide/excursions/${e.id}/edit`} className="btn-secondary py-1.5 text-sm">
                Редагувати
              </Link>
              {e.status === 'DRAFT' && (
                <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => submit.mutate(e.id)}>
                  {moderationEnabled ? 'На модерацію' : 'Опублікувати'}
                </button>
              )}
              {(e.status === 'PUBLISHED' || e.status === 'PENDING_MODERATION' || e.status === 'REJECTED') && (
                <button type="button" className="btn-secondary py-1.5 text-sm" onClick={() => toDraft.mutate(e.id)}>
                  У чернетку
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (window.confirm(`Видалити «${e.title}»?`)) remove.mutate(e.id)
                }}
              >
                Видалити
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function GuideCalendarPage() {
  const { data } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api<{ items: { id: number; starts_at: string; ends_at: string; note: string }[] }>('/api/v1/account/guide/calendar'),
  })
  return (
    <div className="card">
      <h2 className="font-display mb-4 text-xl font-bold">Календар доступності</h2>
      <p className="mb-4 text-sm text-stone-500">Інформаційні слоти — без бронювання.</p>
      <ul className="space-y-2">
        {(data?.items ?? []).map((s) => (
          <li key={s.id} className="text-sm">{new Date(s.starts_at).toLocaleString('uk-UA')} — {new Date(s.ends_at).toLocaleString('uk-UA')}</li>
        ))}
      </ul>
    </div>
  )
}
