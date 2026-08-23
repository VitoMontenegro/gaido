import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { transportApi } from '@gaido/api-client/api/transport'
import { pageTitle } from '@gaido/site-urls/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import RideBookingCard from '../components/RideBookingCard'
import RideOrderInfo from '../components/RideOrderInfo'
import { carrierKindLabel } from '../lib/carrierLabels'
import { absoluteUrl, Seo } from '../lib/seo'
import { routeLabel } from '../lib/transportDestinations'
import type { TransportStop } from '@gaido/api-client/api/types/transport'

function sortedStops(stops: TransportStop[]) {
  return [...stops].sort((a, b) => a.sort_order - b.sort_order)
}

export default function RideDetailPage() {
  const { id } = useParams()
  const rideId = Number(id)

  const { data: ride, isLoading, isError } = useQuery({
    queryKey: ['transport-ride', rideId],
    queryFn: () => transportApi.get(rideId),
    enabled: rideId > 0,
  })

  if (isLoading) return <div className="container-site py-12 text-muted">Завантаження…</div>
  if (isError || !ride) return <div className="container-site py-12 text-muted">Рейс не знайдено</div>

  const stops = sortedStops(ride.stops ?? [])
  const fromCity = stops[0]?.city_name ?? '—'
  const toCity = stops[stops.length - 1]?.city_name ?? '—'
  const route = routeLabel(ride.stops)
  const carrierName = ride.company_name || ride.driver_names || ride.provider_name || 'Перевізник'
  const seoDesc = `${route}. ${ride.price_amount} ${ride.price_currency}. ${carrierKindLabel(ride.kind)} на Vezu.`

  const fromSlug = stops[0]?.city_slug
  const toSlug = stops[stops.length - 1]?.city_slug
  const breadcrumbItems = [
    { label: 'Пошук', to: '/search' },
    ...(fromSlug && toSlug ? [{ label: `${fromCity} → ${toCity}`, to: `/routes/${fromSlug}/${toSlug}` }] : []),
    { label: `Рейс #${ride.id}` },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Trip',
    name: carrierName,
    description: ride.description || seoDesc,
    url: absoluteUrl(`/rides/${ride.id}`),
    offers: {
      '@type': 'Offer',
      price: ride.price_amount,
      priceCurrency: ride.price_currency,
    },
    itinerary: stops.map((s) => ({ '@type': 'City', name: s.city_name })),
  }

  return (
    <>
      <Seo
        title={pageTitle(`${fromCity} → ${toCity}`)}
        description={seoDesc}
        path={`/rides/${ride.id}`}
        image={ride.vehicle_photo_url}
        jsonLd={jsonLd}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <RideOrderInfo ride={ride} />

          <section className="rounded-3xl bg-surface p-5 shadow-[0_4px_24px_rgba(0,0,0,0.05)] md:p-6">
            <h2 className="font-display text-lg font-bold normal-case text-ink">Опис</h2>
            {ride.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{ride.description}</p>
            ) : (
              <p className="mt-3 text-sm italic text-muted">Опис відсутній</p>
            )}
            {ride.parcels_accepted && ride.parcels_terms && (
              <p className="mt-4 rounded-2xl bg-sand-50 px-4 py-3 text-sm text-muted">
                <span className="font-medium text-ink">📦 Посилки:</span> {ride.parcels_terms}
              </p>
            )}
          </section>
        </div>

        <RideBookingCard ride={ride} />
      </div>
    </>
  )
}
