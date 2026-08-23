import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TransportListing, TransportStop } from '@gaido/api-client/api/types/transport'
import { carrierKindLabel, carrierTypeLabel } from '../lib/carrierLabels'
import { routeLabel } from '../lib/transportDestinations'

function sortedStops(stops: TransportStop[]) {
  return [...stops].sort((a, b) => a.sort_order - b.sort_order)
}

function formatTime(t?: string) {
  if (!t) return '—'
  return t.slice(0, 5)
}

function formatDateShort(d?: string) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}

function formatDateLong(d?: string) {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}

function FeatureChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl border border-divider bg-white px-3 py-1.5 text-xs font-medium text-ink">
      {children}
    </span>
  )
}

export default function RideOrderInfo({ ride }: { ride: TransportListing }) {
  const stops = sortedStops(ride.stops ?? [])
  const fromCity = stops[0]?.city_name ?? '—'
  const toCity = stops[stops.length - 1]?.city_name ?? '—'
  const route = routeLabel(ride.stops)
  const carrierName = ride.company_name || ride.driver_names || ride.provider_name || 'Перевізник'
  const driverInitial = carrierName.slice(0, 1).toUpperCase()
  const selectedDep = ride.departures?.[0]
  const departDate = selectedDep?.depart_on
  const seatsAvail = selectedDep?.seats_left ?? ride.seats_available ?? ride.seats_total
  const intermediateCount = Math.max(0, stops.length - 2)

  return (
    <article className="ride-order-info overflow-hidden rounded-3xl bg-surface shadow-[0_8px_40px_rgba(0,0,0,0.07)]">
      <header className="border-b border-divider px-5 py-6 md:px-8">
        <h1 className="font-display text-2xl font-bold normal-case tracking-normal text-ink md:text-[28px] md:leading-tight">
          {fromCity} → {toCity}
          {departDate && (
            <span className="mt-1 block text-base font-normal text-muted md:mt-0 md:inline md:text-[22px]">
              {' '}— {formatDateLong(departDate)}
            </span>
          )}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal-dark">{carrierTypeLabel(ride)}</span>
          <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-muted">{carrierKindLabel(ride.kind)}</span>
          {ride.verified_ukrainian && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800">🇺🇦 верифікований</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-7 md:gap-6 md:px-8">
        <div>
          <p className="text-lg font-semibold tabular-nums text-ink md:text-xl">
            {formatDateShort(departDate)} <span className="text-teal">{formatTime(ride.depart_time)}</span>
          </p>
          <p className="mt-2 font-display text-xl font-bold normal-case text-ink md:text-2xl">{fromCity}</p>
          {stops[0]?.country_name && <p className="text-sm text-muted">{stops[0].country_name}</p>}
        </div>

        <div className="flex flex-col items-center px-1 md:px-3">
          <div className="flex items-center">
            <span className="h-3 w-3 shrink-0 rounded-full bg-teal ring-4 ring-teal/15" />
            <span className="mx-1 h-0.5 w-8 bg-linear-to-r from-teal to-teal/30 md:w-16" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal/10 text-base">🚐</span>
            <span className="mx-1 h-0.5 w-8 bg-linear-to-r from-teal/30 to-teal md:w-16" />
            <span className="h-3 w-3 shrink-0 rounded-full bg-teal ring-4 ring-teal/15" />
          </div>
          {intermediateCount > 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              {intermediateCount} {intermediateCount === 1 ? 'зупинка' : intermediateCount < 5 ? 'зупинки' : 'зупинок'}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-ink md:text-xl">
            {formatDateShort(departDate)} <span className="text-teal">~{formatTime(ride.arrive_time_approx)}</span>
          </p>
          <p className="mt-2 font-display text-xl font-bold normal-case text-ink md:text-2xl">{toCity}</p>
          {stops[stops.length - 1]?.country_name && (
            <p className="text-sm text-muted">{stops[stops.length - 1].country_name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-divider bg-sand-50 px-5 py-4 md:px-8">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Вартість</p>
          <p className="mt-1 font-display text-3xl font-bold text-teal">
            {ride.price_amount} <span className="text-xl">{ride.price_currency}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Вільно місць</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{seatsAvail}</p>
        </div>
      </div>

      {stops.length > 2 && (
        <div className="border-t border-divider px-5 py-3 md:px-8">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Повний маршрут:</span> {route}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-divider px-5 py-5 md:px-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal/10 font-display text-xl font-bold text-teal">
          {driverInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold normal-case text-ink">{ride.driver_names || carrierName}</p>
          <p className="text-sm text-muted">
            {ride.vehicle_brand || 'Авто не вказано'}
            {ride.bookings_count != null && ride.bookings_count > 0 ? ` · ${ride.bookings_count}+ поїздок` : ' · Новий перевізник'}
          </p>
          {ride.provider_slug && (
            <Link to={`/carriers/${ride.provider_slug}`} className="text-sm font-medium text-teal hover:underline">
              Профіль перевізника →
            </Link>
          )}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {ride.parcels_accepted && <FeatureChip>📦 Багаж / посилки</FeatureChip>}
          {ride.verified_ukrainian && <FeatureChip>🇺🇦 Верифікований</FeatureChip>}
          <FeatureChip>💺 {ride.seats_total} місць</FeatureChip>
        </div>
      </div>
    </article>
  )
}
