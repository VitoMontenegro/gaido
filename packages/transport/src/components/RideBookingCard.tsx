import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TransportListing } from '@gaido/api-client/api/types/transport'
import { transportBookingApi } from '@gaido/api-client/api/transportBooking'
import { useMe } from '@gaido/api-client/hooks/useAuth'

type Props = {
  ride: TransportListing & {
    description?: string
    seats_available?: number
    subscription_active?: boolean
    logged_in?: boolean
  }
}

function formatDate(d?: string) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(d))
  } catch {
    return d
  }
}

export default function RideBookingCard({ ride }: Props) {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [departureId, setDepartureId] = useState<number | undefined>(ride.departures?.[0]?.id)
  const [seats, setSeats] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [success, setSuccess] = useState(false)

  const selectedDep = ride.departures?.find((d) => d.id === departureId) ?? ride.departures?.[0]
  const seatsAvail = selectedDep?.seats_left ?? ride.seats_available ?? ride.seats_total

  const { data: companions } = useQuery({
    queryKey: ['ride-companions', ride.id, departureId],
    queryFn: () => transportBookingApi.companions(ride.id, departureId),
    enabled: ride.id > 0,
  })

  const book = useMutation({
    mutationFn: () =>
      transportBookingApi.create({
        listing_id: ride.id,
        departure_id: departureId,
        seats,
        passenger_name: name || `${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim(),
        passenger_phone: phone,
      }),
    onSuccess: () => {
      setSuccess(true)
      qc.invalidateQueries({ queryKey: ['ride-companions', ride.id] })
      qc.invalidateQueries({ queryKey: ['transport-ride', ride.id] })
    },
  })

  const hasContact = Boolean(ride.phone)

  return (
    <aside className="sticky top-24 space-y-5 rounded-3xl bg-surface p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] lg:top-28">
      {ride.departures && ride.departures.length > 1 && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Дата виїзду</span>
          <select className="input" value={departureId ?? ''} onChange={(e) => setDepartureId(Number(e.target.value) || undefined)}>
            {ride.departures.map((d) => (
              <option key={d.id ?? d.depart_on} value={d.id ?? ''}>
                {formatDate(d.depart_on)}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedDep && ride.departures!.length <= 1 && (
        <p className="text-sm text-muted">{formatDate(selectedDep.depart_on)}</p>
      )}

      {success ? (
        <div className="space-y-3 rounded-2xl bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">Заявку надіслано!</p>
          <p>Перевізник зв&apos;яжеться з вами для підтвердження.</p>
          <Link to="/account/bookings" className="btn-accent inline-block w-full text-center">Мої бронювання</Link>
        </div>
      ) : !me ? (
        <div className="space-y-3">
          <Link to="/login" state={{ from: `/rides/${ride.id}` }} className="btn-accent block w-full text-center">
            Забронювати квиток
          </Link>
          <Link to="/login" state={{ from: `/rides/${ride.id}` }} className="btn-secondary block w-full text-center">
            Написати перевізнику
          </Link>
          <p className="text-center text-xs text-muted">
            <Link to="/register" className="text-teal hover:underline">Реєстрація</Link>
            {' '}або{' '}
            <Link to="/login" state={{ from: `/rides/${ride.id}` }} className="text-teal hover:underline">вхід</Link>
          </p>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); book.mutate() }}>
          <button type="submit" className="btn-accent w-full" disabled={book.isPending || !phone.trim()}>
            {book.isPending ? 'Надсилання…' : 'Забронювати квиток'}
          </button>
          <label className="block space-y-1 text-sm">
            <span>Місць</span>
            <input className="input" type="number" min={1} max={Math.min(seatsAvail, 8)} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Ім&apos;я</span>
            <input className="input" value={name} placeholder={`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Телефон *</span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
        </form>
      )}

      <section className="space-y-2 border-t border-divider pt-4">
        <h3 className="font-display text-sm font-bold normal-case text-ink">Попутники</h3>
        {(companions?.items?.length ?? 0) > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {companions!.items.map((c, i) => (
              <li key={i} className="rounded-full bg-sand-100 px-3 py-1 text-xs text-muted">
                {c.name} · {c.seats} міс.
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Поки ніхто не забронював</p>
        )}
      </section>

      {hasContact && (
        <div className="border-t border-divider pt-4 text-sm">
          <p className="mb-1 font-medium text-ink">Контакт перевізника</p>
          <p>📞 {ride.phone}</p>
        </div>
      )}
    </aside>
  )
}
