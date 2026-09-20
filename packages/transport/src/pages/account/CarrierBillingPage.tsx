import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { carrierBillingApi } from '@gaido/api-client/api/transportBooking'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../../lib/seo'

export default function CarrierBillingPage() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<number | null>(null)
  const { data: status } = useQuery({ queryKey: ['carrier-billing-status'], queryFn: () => carrierBillingApi.status() })
  const { data: plans } = useQuery({ queryKey: ['carrier-billing-plans'], queryFn: () => carrierBillingApi.plans() })

  const pay = async (planId: number) => {
    setBusy(planId)
    try {
      const res = await carrierBillingApi.checkout(planId)
      await carrierBillingApi.confirm(res.payment_id, planId)
      qc.invalidateQueries({ queryKey: ['carrier-billing-status'] })
      qc.invalidateQueries({ queryKey: ['carrier-account'] })
      alert('Підписку активовано. Контакти та бронювання доступні.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка оплати')
    } finally {
      setBusy(null)
    }
  }

  const enabled = status?.payments_enabled ?? false

  return (
    <>
      <Seo title={pageTitle('Підписка Vezu')} path="/account/carrier/billing" noIndex />
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="section-title-sm">Підписка Vezu</h1>
          <p className="text-sm text-muted">Підписка зараз не обовʼязкова: контакти та бронювання доступні без оплати.</p>
        </div>

        <div className="card space-y-2 p-5 text-sm">
          <p>
            Статус:{' '}
            <strong>{status?.subscription_active ? 'активна' : 'не активна'}</strong>
          </p>
          {status?.subscription?.expires_at && (
            <p className="text-muted">Діє до: {new Date(status.subscription.expires_at).toLocaleDateString('uk-UA')}</p>
          )}
        </div>

        {!enabled && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Оплата вимкнена — у dev режимі використовуйте demo-seed для активної підписки.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {(plans?.items ?? []).map((p) => (
            <div key={p.id} className="card flex flex-col gap-3 p-4">
              <p className="font-medium text-ink">{p.name}</p>
              <p className="text-2xl font-bold text-teal">{p.price} {p.currency}</p>
              <p className="text-xs text-muted">{p.duration_days} днів</p>
              {enabled && (
                <button type="button" className="btn-accent mt-auto" disabled={busy === p.id} onClick={() => pay(p.id)}>
                  {busy === p.id ? '…' : 'Оплатити'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
