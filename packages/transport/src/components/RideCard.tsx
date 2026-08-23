import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import type { TransportListing } from '@gaido/api-client/api/types/transport'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { carrierKindLabel, carrierTypeLabel } from '../lib/carrierLabels'
import { routeLabel } from '../lib/transportDestinations'

function nextDeparture(listing: TransportListing) {
  return listing.departures?.[0]?.depart_on ?? null
}

export default function RideCard({ ride }: { ride: TransportListing }) {
  const carrierName = ride.company_name || ride.driver_names || ride.provider_name || 'Перевізник'
  const route = routeLabel(ride.stops)
  const typeLabel = carrierTypeLabel(ride)
  const kindLabel = carrierKindLabel(ride.kind)
  const photo = ride.vehicle_photo_url ? resolveMediaUrl(ride.vehicle_photo_url) : staticAssetUrl('/images/home/search.jpg')
  const nextDate = nextDeparture(ride)

  return (
    <Link
      to={`/rides/${ride.id}`}
      className="group card flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
    >
      <img src={photo} alt="" className="hidden h-auto w-36 shrink-0 object-cover sm:block md:w-44 rounded-md" loading="lazy" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-ink group-hover:text-teal md:text-lg">{route}</h3>
            <p className="mt-0.5 truncate text-sm text-muted">{carrierName}</p>
          </div>
          <p className="shrink-0 text-right font-semibold text-teal">
            {ride.price_amount} {ride.price_currency}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800">{typeLabel}</span>
          <span className="rounded-full bg-sand-100 px-2 py-0.5 text-muted">{kindLabel}</span>
          {ride.verified_ukrainian && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-800">🇺🇦</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>
            {ride.depart_time?.slice(0, 5)}
            {ride.arrive_time_approx ? ` → ~${ride.arrive_time_approx.slice(0, 5)}` : ''}
            {nextDate ? ` · ${nextDate}` : ''}
          </span>
          <span>{ride.seats_available ?? ride.seats_total} місць</span>
          {ride.parcels_accepted && <span>📦 посилки</span>}
        </div>
      </div>
    </Link>
  )
}
