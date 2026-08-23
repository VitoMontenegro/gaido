import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transportBookingApi } from '@gaido/api-client/api/transportBooking'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../../lib/seo'

const statusLabel: Record<string, string> = {
  pending: 'Очікує',
  confirmed: 'Підтверджено',
  cancelled: 'Скасовано',
  completed: 'Завершено',
}

function BookingsList({ incoming }: { incoming?: boolean }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: incoming ? ['incoming-bookings'] : ['my-bookings'],
    queryFn: () => (incoming ? transportBookingApi.incoming() : transportBookingApi.myBookings()),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => transportBookingApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incoming-bookings'] })
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
    },
  })

  if (isLoading) return <p className="text-muted">Завантаження…</p>
  if (!data?.items?.length) return <p className="text-muted">{incoming ? 'Немає нових заявок' : 'У вас ще немає бронювань'}</p>

  return (
    <ul className="space-y-3">
      {data.items.map((b) => (
        <li key={b.id} className="card space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-ink">{b.listing_title ?? `Рейс #${b.listing_id}`}</p>
              <p className="text-sm text-muted">
                {b.depart_on && `${b.depart_on} · `}{b.seats} міс. · {b.passenger_name}
              </p>
              {!incoming && b.provider_name && (
                <Link to={`/carriers/${b.provider_slug}`} className="text-xs text-teal hover:underline">{b.provider_name}</Link>
              )}
            </div>
            <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-medium">{statusLabel[b.status] ?? b.status}</span>
          </div>
          {incoming && (
            <div className="flex gap-2">
              <button type="button" className="btn-accent py-1 text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })}>Підтвердити</button>
              <button type="button" className="btn-secondary py-1 text-xs" onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })}>Відхилити</button>
            </div>
          )}
          {!incoming && (
            <Link to={`/rides/${b.listing_id}`} className="text-sm text-teal hover:underline">Переглянути рейс →</Link>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function BookingsAccountPage() {
  return (
    <>
      <Seo title={pageTitle('Мої бронювання')} path="/account/bookings" noIndex />
      <div className="space-y-8">
        <div>
          <h1 className="section-title-sm">Мої бронювання</h1>
          <p className="text-sm text-muted">Заявки на місця в рейсах Vezu</p>
        </div>
        <BookingsList />
        <section className="space-y-3 border-t border-divider pt-8">
          <h2 className="font-medium text-ink">Вхідні заявки (перевізник)</h2>
          <BookingsList incoming />
        </section>
      </div>
    </>
  )
}
