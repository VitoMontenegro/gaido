import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, userDisplayName, type AdminCarrier, type AdminExcursion, type AdminGuide, type AdminListParams, type AdminProvider, type AdminOffering, type AdminComplaint, type AdminReview, type AdminTransportRide, type AdminUser } from '@gaido/api-client/api/client'
import { isTransportSite, isServicesSite, transportUrl, servicesUrl } from '@gaido/site-urls/site'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { formatPrice } from './excursionUi'
import GuideAvatar from './GuideAvatar'
import { AdminGuideDocuments } from './AdminGuideDocuments'
import { guideTypeBadgeLabel } from '../lib/fancybox'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    PUBLISHED: 'bg-emerald-50 text-emerald-700',
    VERIFIED: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-800',
    PENDING_MODERATION: 'bg-amber-50 text-amber-800',
    WAITING_PAYMENT: 'bg-amber-50 text-amber-800',
    MODERATION: 'bg-amber-50 text-amber-800',
    NEED_INFO: 'bg-amber-50 text-amber-800',
    NEW: 'bg-amber-50 text-amber-800',
    OPEN: 'bg-amber-50 text-amber-800',
    DRAFT: 'bg-sand-100 text-stone-600',
    REJECTED: 'bg-red-50 text-red-700',
    BLOCKED: 'bg-red-50 text-red-700',
    EXPIRED: 'bg-stone-100 text-stone-600',
    SUSPENDED: 'bg-red-50 text-red-700',
    RESOLVED: 'bg-emerald-50 text-emerald-700',
    DISMISSED: 'bg-stone-100 text-stone-600',
  }
  return map[status] ?? 'bg-sand-100 text-stone-600'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Активний',
    PUBLISHED: 'Опубліковано',
    VERIFIED: 'Верифіковано',
    PENDING: 'Очікує',
    PENDING_MODERATION: 'На модерації',
    WAITING_PAYMENT: 'Очікує оплату',
    MODERATION: 'На модерації',
    NEED_INFO: 'Потрібні дані',
    NEW: 'Новий',
    OPEN: 'Відкрита',
    DRAFT: 'Чернетка',
    REJECTED: 'Відхилено',
    BLOCKED: 'Заблоковано',
    EXPIRED: 'Закінчився',
    SUSPENDED: 'Призупинено',
    RESOLVED: 'Вирішено',
    DISMISSED: 'Відхилено',
  }
  return map[status] ?? status
}

function guideTypeBadgeClass(guide: AdminGuide) {
  if (guide.catalog_status === 'companion') {
    return 'bg-violet-50 text-violet-700'
  }
  if (guide.guide_type === 'ENTERTAINER') {
    return 'bg-sky-50 text-sky-700'
  }
  return 'bg-teal/10 text-teal'
}

function guideNeedsApproval(status: string) {
  return status === 'DRAFT' || status === 'WAITING_PAYMENT' || status === 'EXPIRED'
}

const ADMIN_PAGE_SIZE = 50

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function formatAdminDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('uk-UA')
}

function useAdminListQuery(statusFilter?: string) {
  const [qInput, setQInput] = useState('')
  const q = useDebouncedValue(qInput.trim())
  const [countrySlug, setCountrySlug] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setOffset(0)
  }, [q, countrySlug, order, statusFilter])

  useEffect(() => {
    setCountrySlug('')
  }, [statusFilter])

  const params: AdminListParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q ? { q } : {}),
    ...(countrySlug ? { country_slug: countrySlug } : {}),
    order,
    limit: ADMIN_PAGE_SIZE,
    offset,
  }
  return { qInput, setQInput, countrySlug, setCountrySlug, order, setOrder, offset, setOffset, params }
}

function AdminListFilters({
  q,
  onQ,
  countrySlug,
  onCountry,
  order,
  onOrder,
  countries,
  searchPlaceholder,
}: {
  q: string
  onQ: (value: string) => void
  countrySlug: string
  onCountry: (value: string) => void
  order: 'asc' | 'desc'
  onOrder: (value: 'asc' | 'desc') => void
  countries: { slug: string; name: string }[]
  searchPlaceholder: string
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-divider px-4 py-3">
      <input
        className="input max-w-xs py-2"
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <select className="input w-auto min-w-[12rem] py-2" value={countrySlug} onChange={(e) => onCountry(e.target.value)}>
        <option value="">Усі країни</option>
        {countries.map((c) => (
          <option key={c.slug} value={c.slug}>{c.name}</option>
        ))}
      </select>
      <select className="input w-auto min-w-[12rem] py-2" value={order} onChange={(e) => onOrder(e.target.value as 'asc' | 'desc')}>
        <option value="desc">Спочатку нові</option>
        <option value="asc">Спочатку старі</option>
      </select>
    </div>
  )
}

function AdminPager({
  total,
  limit,
  offset,
  onOffset,
}: {
  total: number
  limit: number
  offset: number
  onOffset: (offset: number) => void
}) {
  if (total <= limit && offset === 0) return null
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-4 py-3 text-sm">
      <p className="text-stone-500">{from}–{to} з {total}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={offset <= 0} onClick={() => onOffset(Math.max(0, offset - limit))}>
          Назад
        </button>
        <button type="button" className="btn-secondary" disabled={offset + limit >= total} onClick={() => onOffset(offset + limit)}>
          Далі
        </button>
      </div>
    </div>
  )
}

export function AdminUsersList() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users(),
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-guides'] })
      qc.invalidateQueries({ queryKey: ['admin-excursions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const clearLoginBlock = useMutation({
    mutationFn: (login: string) => adminApi.clearLoginRateLimit({ login }),
    onSuccess: (res, login) => {
      const msg = res.login_cleared
        ? `Блок входу для «${login}» знято`
        : `Логін «${login}» не був заблокований`
      window.alert(msg)
    },
    onError: (err: Error) => window.alert(err.message),
  })

  if (isLoading) return <ListShell title="Користувачі">Завантаження…</ListShell>
  if (isError) return <ListShell title="Користувачі">{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title="Користувачі" count={(data?.items ?? []).length}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Логін</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Ролі</th>
            <th className="px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((u: AdminUser) => (
            <tr key={u.id} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5">{u.id}</td>
              <td className="px-4 py-2.5 font-medium">{userDisplayName(u)}</td>
              <td className="px-4 py-2.5 text-stone-600">{u.email}</td>
              <td className="px-4 py-2.5">{u.roles.join(', ')}</td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(u.status)}`}>
                  {u.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-amber-200 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    disabled={clearLoginBlock.isPending}
                    onClick={() => {
                      const label = userDisplayName(u)
                      if (window.confirm(`Зняти блок входу для «${label}»?`)) {
                        clearLoginBlock.mutate(u.login)
                      }
                    }}
                  >
                    Зняти блок входу
                  </button>
                  {me?.id !== u.id && (
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={remove.isPending}
                      onClick={() => {
                        const label = userDisplayName(u)
                        const extra = u.roles.includes('ROLE_GUIDE') ? ' Профіль гіда та екскурсії також будуть видалені.' : ''
                        if (window.confirm(`Видалити «${label}»?${extra}`)) {
                          remove.mutate(u.id)
                        }
                      }}
                    >
                      Видалити
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ListShell>
  )
}

export function AdminGuidesList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const list = useAdminListQuery(statusFilter)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-guides', list.params],
    queryFn: () => adminApi.guides(list.params),
    placeholderData: keepPreviousData,
  })
  const { data: plans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.plans(),
  })
  const placementPlanId = (plans?.items ?? []).find((p) => p.plan_type === 'GUIDE_PLACEMENT')?.id
    ?? plans?.items?.[0]?.id

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteGuide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-guides'] })
      qc.invalidateQueries({ queryKey: ['guides'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const approve = useMutation({
    mutationFn: (id: number) => adminApi.approveGuide(id, placementPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-guides'] })
      qc.invalidateQueries({ queryKey: ['guides'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const title = statusFilter === 'ACTIVE'
    ? 'Активні гіди'
    : statusFilter === 'DRAFT'
      ? 'Гіди — чернетки'
      : statusFilter === 'WAITING_PAYMENT'
        ? 'Гіди — очікують активації'
        : 'Гіди'

  const items = data?.items ?? []
  const total = data?.total ?? items.length
  const filters = (
    <AdminListFilters
      q={list.qInput}
      onQ={list.setQInput}
      countrySlug={list.countrySlug}
      onCountry={list.setCountrySlug}
      order={list.order}
      onOrder={list.setOrder}
      countries={data?.countries ?? []}
      searchPlaceholder="Пошук за імʼям"
    />
  )

  if (isLoading && !data) return <ListShell title={title} toolbar={filters}><div className="px-4 py-3">Завантаження…</div></ListShell>
  if (isError) return <ListShell title={title} toolbar={filters}><div className="px-4 py-3">{error?.message ?? 'Помилка'}</div></ListShell>

  return (
    <ListShell
      title={title}
      count={total}
      toolbar={filters}
      footer={<AdminPager total={total} limit={data?.limit ?? ADMIN_PAGE_SIZE} offset={list.offset} onOffset={list.setOffset} />}
    >
      <ul className="divide-y divide-divider">
        {items.map((g) => (
          <li key={g.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <GuideAvatar avatar={g.avatar_url} name={g.display_name} className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.display_name}</p>
                <p className="text-sm text-stone-500">
                  /{g.slug}
                  {(g.cities ?? []).length > 0 ? ` · ${(g.cities ?? []).join(', ')}` : ''}
                  {` · ${formatAdminDate(g.created_at)}`}
                </p>
              </div>
              <span className={`rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium ${guideTypeBadgeClass(g)}`}>
                {guideTypeBadgeLabel(g)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(g.status)}`}>
                {statusLabel(g.status)}
              </span>
              <div className="flex items-center gap-2">
                {guideNeedsApproval(g.status) && (
                  <button
                    type="button"
                    className="rounded-lg border border-emerald/200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald/50 disabled:opacity-50"
                    disabled={approve.isPending || !placementPlanId}
                    title={placementPlanId ? undefined : 'Немає тарифного плану'}
                    onClick={() => {
                      if (window.confirm(`Схвалити гіда «${g.display_name}»? Профіль стане ACTIVE.`)) {
                        approve.mutate(g.id)
                      }
                    }}
                  >
                    Схвалити
                  </button>
                )}
                <Link to={`/guide/${g.slug}`} className="text-sm text-teal hover:underline" target="_blank">
                  Відкрити
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Видалити гіда «${g.display_name}»? Профіль, екскурсії та відгуки будуть видалені.`)) {
                      remove.mutate(g.id)
                    }
                  }}
                >
                  Видалити
                </button>
              </div>
            </div>
            {(g.documents ?? []).length > 0 && (
              <div className="mt-3 pl-[52px]">
                <AdminGuideDocuments documents={g.documents ?? []} />
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-sm text-stone-500">Гідів не знайдено</li>
        )}
      </ul>
    </ListShell>
  )
}

export function AdminExcursionsList() {
  const qc = useQueryClient()
  const list = useAdminListQuery()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-excursions', list.params],
    queryFn: () => adminApi.excursions(list.params),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteExcursion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-excursions'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? items.length
  const filters = (
    <AdminListFilters
      q={list.qInput}
      onQ={list.setQInput}
      countrySlug={list.countrySlug}
      onCountry={list.setCountrySlug}
      order={list.order}
      onOrder={list.setOrder}
      countries={data?.countries ?? []}
      searchPlaceholder="Пошук за назвою"
    />
  )

  if (isLoading && !data) return <ListShell title="Екскурсії" toolbar={filters}><div className="px-4 py-3">Завантаження…</div></ListShell>
  if (isError) return <ListShell title="Екскурсії" toolbar={filters}><div className="px-4 py-3">{error?.message ?? 'Помилка'}</div></ListShell>

  return (
    <ListShell
      title="Екскурсії"
      count={total}
      toolbar={filters}
      footer={<AdminPager total={total} limit={data?.limit ?? ADMIN_PAGE_SIZE} offset={list.offset} onOffset={list.setOffset} />}
    >
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Назва</th>
            <th className="px-4 py-2 font-medium">Гід</th>
            <th className="px-4 py-2 font-medium">Країна</th>
            <th className="px-4 py-2 font-medium">Дата</th>
            <th className="px-4 py-2 font-medium">Ціна</th>
            <th className="px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((e: AdminExcursion) => (
            <tr key={e.id} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5">{e.id}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-stone-500">/{e.slug}</p>
              </td>
              <td className="px-4 py-2.5 text-stone-600">{e.guide_name || `#${e.guide_id}`}</td>
              <td className="px-4 py-2.5 text-stone-600">{e.country_name || '—'}</td>
              <td className="px-4 py-2.5 text-stone-600">{formatAdminDate(e.created_at)}</td>
              <td className="px-4 py-2.5">{formatPrice(e.price_from, e.currency)}</td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(e.status)}`}>
                  {statusLabel(e.status)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-2">
                  <Link to={`/excursion/${e.slug}`} className="text-sm text-teal hover:underline" target="_blank">
                    Відкрити
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Видалити «${e.title}»? Цю дію не можна скасувати.`)) {
                        remove.mutate(e.id)
                      }
                    }}
                  >
                    Видалити
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-sm text-stone-500">Екскурсій не знайдено</td>
            </tr>
          )}
        </tbody>
      </table>
    </ListShell>
  )
}

export function AdminReviewsList() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => adminApi.reviews(),
  })
  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  })

  if (isLoading) return <ListShell title="Відгуки">Завантаження…</ListShell>
  if (isError) return <ListShell title="Відгуки">{error?.message ?? 'Помилка'}</ListShell>

  const items = data?.items ?? []
  const disputedCount = items.filter((r) => r.dispute?.status === 'OPEN').length

  return (
    <ListShell title="Відгуки" count={items.length}>
      {disputedCount > 0 && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {disputedCount} оскаржень потребують уваги
        </p>
      )}
      <ul className="divide-y divide-divider">
        {items.map((r: AdminReview) => (
          <li key={r.id} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.author_name ?? `Користувач #${r.author_id}`}</span>
                <span className="text-amber-600">{'★'.repeat(r.rating)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}>
                  {statusLabel(r.status)}
                </span>
                {r.dispute?.status === 'OPEN' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    Оскарження
                  </span>
                )}
              </div>
              <button
                type="button"
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm('Видалити цей відгук? Дію не можна скасувати.')) {
                    remove.mutate(r.id)
                  }
                }}
              >
                Видалити
              </button>
            </div>
            {r.excursion_title && (
              <p className="text-sm text-stone-500">Екскурсія: {r.excursion_title}</p>
            )}
            <p className="text-sm text-stone-700">{r.text}</p>
            {r.dispute && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium text-amber-900">Коментар гіда</p>
                <p className="mt-1 whitespace-pre-wrap text-amber-800">{r.dispute.text}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </ListShell>
  )
}

function carrierStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Чернетка',
    pending: 'На модерації',
    published: 'Опубліковано',
    suspended: 'Призупинено',
  }
  return map[status] ?? status
}

function rideStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Чернетка',
    pending: 'На модерації',
    published: 'Опубліковано',
    rejected: 'Відхилено',
  }
  return map[status] ?? status
}

function carrierTypeLabel(type: string) {
  const map: Record<string, string> = {
    company: 'Компанія',
    fop: 'ФОП',
    private: 'Приватний',
    individual: 'Фіз. особа',
  }
  return map[type] ?? type
}

export function AdminCarriersList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-carriers', statusFilter ?? 'all'],
    queryFn: () => adminApi.carriers(statusFilter ? { status: statusFilter } : undefined),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof adminApi.updateCarrier>[1] }) =>
      adminApi.updateCarrier(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carriers'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['mod-carriers'] })
    },
  })

  const bypass = useMutation({
    mutationFn: (id: number) => adminApi.bypassCarrier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carriers'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const title = statusFilter === 'published'
    ? 'Опубліковані перевізники'
    : statusFilter === 'pending'
      ? 'Перевізники на модерації'
      : statusFilter === 'suspended'
        ? 'Призупинені перевізники'
        : 'Перевізники Vezu'

  if (isLoading) return <ListShell title={title}>Завантаження…</ListShell>
  if (isError) return <ListShell title={title}>{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title={title} count={(data?.items ?? []).length}>
      <ul className="divide-y divide-divider">
        {(data?.items ?? []).map((c: AdminCarrier) => (
          <li key={c.provider_id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.display_name}</p>
                <p className="text-sm text-stone-500">
                  /{c.website_slug}
                  {c.base_city_name ? ` · ${c.base_city_name}` : ''}
                  {c.phone ? ` · ${c.phone}` : ''}
                </p>
              </div>
              <span className="rounded-full bg-sand/10 px-2 py-0.5 text-xs font-medium text-stone-600">
                {carrierTypeLabel(c.carrier_type)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(c.status.toUpperCase())}`}>
                {carrierStatusLabel(c.status)}
              </span>
              {c.subscription_active ? (
                <span className="rounded-full bg-emerald/50 px-2 py-0.5 text-xs font-medium text-emerald-700">Підписка</span>
              ) : (
                <span className="rounded-full bg-amber/50 px-2 py-0.5 text-xs font-medium text-amber-800">Без підписки</span>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {c.status === 'pending' && (
                  <button
                    type="button"
                    className="rounded-lg border border-emerald/200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald/50 disabled:opacity-50"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: c.provider_id, patch: { status: 'published' } })}
                  >
                    Схвалити
                  </button>
                )}
                {c.status === 'published' && (
                  <button
                    type="button"
                    className="rounded-lg border border-amber/200 px-2 py-1 text-xs text-amber-800 hover:bg-amber/50 disabled:opacity-50"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: c.provider_id, patch: { status: 'suspended' } })}
                  >
                    Призупинити
                  </button>
                )}
                {(c.status === 'suspended' || c.status === 'draft') && (
                  <button
                    type="button"
                    className="rounded-lg border border-emerald/200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald/50 disabled:opacity-50"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: c.provider_id, patch: { status: 'published' } })}
                  >
                    Опублікувати
                  </button>
                )}
                {!c.subscription_active && (
                  <button
                    type="button"
                    className="rounded-lg border border-teal/30 px-2 py-1 text-xs text-teal hover:bg-teal/5 disabled:opacity-50"
                    disabled={bypass.isPending}
                    onClick={() => {
                      if (window.confirm(`Активувати підписку для «${c.display_name}»?`)) {
                        bypass.mutate(c.provider_id)
                      }
                    }}
                  >
                    Підписка (bypass)
                  </button>
                )}
                {isTransportSite() ? (
                  <Link to={`/carriers/${c.website_slug}`} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                    Vezu
                  </Link>
                ) : (
                  <a href={transportUrl(`/carriers/${c.website_slug}`)} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                    Vezu
                  </a>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 pl-0 text-xs text-stone-500">
              {(['identity', 'ukrainian', 'business', 'documents'] as const).map((field) => {
                const key = `${field}_status` as keyof AdminCarrier
                const val = c[key] as string
                return (
                  <button
                    key={field}
                    type="button"
                    className={`rounded-lg border px-2 py-0.5 ${val === 'verified' ? 'border-emerald/200 text-emerald-700' : 'border-border text-stone-600 hover:bg-sand/50'}`}
                    disabled={update.isPending}
                    onClick={() => {
                      const next = val === 'verified' ? 'pending' : 'verified'
                      update.mutate({ id: c.provider_id, patch: { [`${field}_status`]: next } })
                    }}
                  >
                    {field}: {val === 'verified' ? '✓' : val || '—'}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
        {(data?.items ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-stone-500">Перевізників не знайдено. Для демо: LOCAL_SEED=1 ./restart-local.sh</li>
        )}
      </ul>
    </ListShell>
  )
}

export function AdminTransportRidesList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-transport-rides', statusFilter ?? 'all'],
    queryFn: () => adminApi.transportRides(statusFilter ? { status: statusFilter } : undefined),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateTransportRide(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-transport-rides'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['mod-transport-rides'] })
    },
  })

  const title = statusFilter === 'published'
    ? 'Опубліковані рейси'
    : statusFilter === 'pending'
      ? 'Рейси на модерації'
      : 'Рейси Vezu'

  if (isLoading) return <ListShell title={title}>Завантаження…</ListShell>
  if (isError) return <ListShell title={title}>{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title={title} count={(data?.items ?? []).length}>
      <ul className="divide-y divide-divider">
        {(data?.items ?? []).map((ride: AdminTransportRide) => (
          <li key={ride.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{ride.company_name || ride.driver_names || ride.provider_name}</p>
              <p className="text-sm text-stone-500">
                #{ride.id} · {ride.kind === 'regular' ? 'Регулярний' : 'Попутка'} · {ride.provider_name}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(ride.status.toUpperCase())}`}>
              {rideStatusLabel(ride.status)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ride.status === 'pending' && (
                <>
                  <button type="button" className="rounded-lg border border-emerald/200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald/50 disabled:opacity-50" disabled={update.isPending} onClick={() => update.mutate({ id: ride.id, status: 'published' })}>Схвалити</button>
                  <button type="button" className="rounded-lg border border-red/200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={update.isPending} onClick={() => update.mutate({ id: ride.id, status: 'rejected' })}>Відхилити</button>
                </>
              )}
              {ride.status === 'published' && (
                <button type="button" className="rounded-lg border border-amber/200 px-2 py-1 text-xs text-amber-800 hover:bg-amber/50 disabled:opacity-50" disabled={update.isPending} onClick={() => update.mutate({ id: ride.id, status: 'draft' })}>Зняти</button>
              )}
              {(ride.status === 'rejected' || ride.status === 'draft') && (
                <button type="button" className="rounded-lg border border-emerald/200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald/50 disabled:opacity-50" disabled={update.isPending} onClick={() => update.mutate({ id: ride.id, status: 'published' })}>Опублікувати</button>
              )}
              {isTransportSite() ? (
                <Link to={`/rides/${ride.id}`} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">Vezu</Link>
              ) : (
                <a href={transportUrl(`/rides/${ride.id}`)} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">Vezu</a>
              )}
            </div>
          </li>
        ))}
        {(data?.items ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-stone-500">Рейсів не знайдено. Для демо: LOCAL_SEED=1 ./restart-local.sh</li>
        )}
      </ul>
    </ListShell>
  )
}

// Marketplace (servis) components

export function AdminProvidersList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-providers', statusFilter ?? 'all'],
    queryFn: () => adminApi.providers(statusFilter ? { status: statusFilter } : undefined),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateProvider(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const title = statusFilter === 'verified'
    ? 'Верифіковані автори'
    : statusFilter === 'moderation'
      ? 'Автори на модерації'
      : statusFilter === 'new'
        ? 'Нові автори'
        : statusFilter === 'blocked'
          ? 'Заблоковані автори'
          : 'Автори оголошень'

  if (isLoading) return <ListShell title={title}>Завантаження…</ListShell>
  if (isError) return <ListShell title={title}>{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title={title} count={(data?.items ?? []).length}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Назва</th>
            <th className="px-4 py-2 font-medium">Користувач</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Рейтинг</th>
            <th className="px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((p: AdminProvider) => (
            <tr key={p.id} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5">{p.id}</td>
              <td className="px-4 py-2.5 font-medium">{p.display_name}</td>
              <td className="px-4 py-2.5 text-stone-600">{p.login}</td>
              <td className="px-4 py-2.5 text-sm text-stone-500">{p.email}</td>
              <td className="px-4 py-2.5">
                {p.rating_avg > 0 ? (
                  <span className="text-amber-600">{'★'.repeat(Math.max(1, Math.round(p.rating_avg)))} ({p.rating_count})</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(p.status.toUpperCase())}`}>
                  {statusLabel(p.status.toUpperCase())}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {(p.status === 'new' || p.status === 'moderation' || p.status === 'need_info') && (
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: p.id, status: 'verified' })}
                    >
                      Схвалити
                    </button>
                  )}
                  {p.status === 'verified' && (
                    <button
                      type="button"
                      className="rounded-lg border border-amber-200 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: p.id, status: 'blocked' })}
                    >
                      Заблокувати
                    </button>
                  )}
                  {p.status === 'blocked' && (
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: p.id, status: 'verified' })}
                    >
                      Розблокувати
                    </button>
                  )}
                  {isServicesSite() ? (
                    <Link to={`/provider/${p.website_slug}`} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                      Servis
                    </Link>
                  ) : (
                    <a href={servicesUrl(`/provider/${p.website_slug}`)} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                      Servis
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {(data?.items ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-sm text-stone-500">Авторів не знайдено</td>
            </tr>
          )}
        </tbody>
      </table>
    </ListShell>
  )
}

export function AdminOfferingsList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-offerings', statusFilter ?? 'all'],
    queryFn: () => adminApi.offerings(statusFilter ? { status: statusFilter } : undefined),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateOffering(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offerings'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const title = statusFilter === 'published'
    ? 'Опубліковані оголошення'
    : statusFilter === 'draft'
      ? 'Чернетки оголошень'
      : statusFilter === 'rejected'
        ? 'Відхилені оголошення'
        : 'Оголошення'

  if (isLoading) return <ListShell title={title}>Завантаження…</ListShell>
  if (isError) return <ListShell title={title}>{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title={title} count={(data?.items ?? []).length}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Назва</th>
            <th className="px-4 py-2 font-medium">Провайдер</th>
            <th className="px-4 py-2 font-medium">Категорія</th>
            <th className="px-4 py-2 font-medium">Ціна</th>
            <th className="px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((o: AdminOffering) => (
            <tr key={o.id} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5">{o.id}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{o.title}</p>
                <p className="text-xs text-stone-500">/{o.slug}</p>
              </td>
              <td className="px-4 py-2.5 text-stone-600">{o.provider_name}</td>
              <td className="px-4 py-2.5 text-sm text-stone-500">{o.category_name || o.service_name || '—'}</td>
              <td className="px-4 py-2.5">—</td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(o.status.toUpperCase())}`}>
                  {statusLabel(o.status.toUpperCase())}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {o.status === 'draft' && (
                    <>
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: o.id, status: 'published' })}
                      >
                        Опублікувати
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: o.id, status: 'rejected' })}
                      >
                        Відхилити
                      </button>
                    </>
                  )}
                  {o.status === 'published' && (
                    <button
                      type="button"
                      className="rounded-lg border border-amber-200 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: o.id, status: 'rejected' })}
                    >
                      Зняти
                    </button>
                  )}
                  {o.status === 'rejected' && (
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: o.id, status: 'published' })}
                    >
                      Опублікувати
                    </button>
                  )}
                  {isServicesSite() ? (
                    <Link to={`/provider/${o.provider_slug}`} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                      Servis
                    </Link>
                  ) : (
                    <a href={servicesUrl(`/provider/${o.provider_slug}`)} className="text-sm text-teal hover:underline" target="_blank" rel="noreferrer">
                      Servis
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {(data?.items ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-sm text-stone-500">Оголошень не знайдено</td>
            </tr>
          )}
        </tbody>
      </table>
    </ListShell>
  )
}

export function AdminComplaintsList({ statusFilter }: { statusFilter?: string }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-complaints', statusFilter ?? 'all'],
    queryFn: () => adminApi.complaints(statusFilter ? { status: statusFilter } : undefined),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateComplaint(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-complaints'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const title = statusFilter === 'open'
    ? 'Відкриті скарги'
    : statusFilter === 'resolved'
      ? 'Вирішені скарги'
      : statusFilter === 'dismissed'
        ? 'Відхилені скарги'
        : 'Скарги'

  if (isLoading) return <ListShell title={title}>Завантаження…</ListShell>
  if (isError) return <ListShell title={title}>{error?.message ?? 'Помилка'}</ListShell>

  return (
    <ListShell title={title} count={(data?.items ?? []).length}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-divider bg-sand-50 text-left text-stone-500">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Автор</th>
            <th className="px-4 py-2 font-medium">Тип</th>
            <th className="px-4 py-2 font-medium">Причина</th>
            <th className="px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((c: AdminComplaint) => (
            <tr key={c.id} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5">{c.id}</td>
              <td className="px-4 py-2.5">
                <p className="font-medium">{c.reporter_login}</p>
                <p className="text-xs text-stone-500">{c.reporter_email}</p>
              </td>
              <td className="px-4 py-2.5 text-stone-600">{c.target_type} #{c.target_id}</td>
              <td className="px-4 py-2.5 text-sm text-stone-500">{c.reason}</td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(c.status.toUpperCase())}`}>
                  {statusLabel(c.status.toUpperCase())}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                {c.status === 'open' && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: c.id, status: 'resolved' })}
                    >
                      Вирішити
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: c.id, status: 'dismissed' })}
                    >
                      Відхилити
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {(data?.items ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-sm text-stone-500">Скарг не знайдено</td>
            </tr>
          )}
        </tbody>
      </table>
    </ListShell>
  )
}

function ListShell({
  title,
  count,
  toolbar,
  footer,
  children,
}: {
  title: string
  count?: number
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="font-display text-lg font-bold">
          {title}
          {count != null && <span className="ml-2 text-base font-normal text-stone-500">({count})</span>}
        </h2>
      </div>
      {toolbar}
      <div className="overflow-x-auto">
        {children}
      </div>
      {footer}
    </section>
  )
}
