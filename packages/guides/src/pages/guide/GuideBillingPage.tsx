import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, billingApi } from '@gaido/api-client/api/client'
import {
  type ExcursionItem, formatPrice
} from '../../components/excursionUi'
import { formatPaidUntil, planPeriodLabel } from './shared'

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

  const paymentsEnabled = status?.payments_enabled ?? false

  return (
    <div className="space-y-6">
      <Helmet><title>Білінг</title></Helmet>
      <div>
        <h1 className="font-display text-2xl font-bold">Білінг</h1>
        <h2 className="mt-4 font-display text-xl font-bold">Розміщення та просування</h2>
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
