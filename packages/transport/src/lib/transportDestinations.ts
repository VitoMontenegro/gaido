import type { TransportListing } from '@gaido/api-client/api/types/transport'

export type CityHub = {
  id: number
  slug: string
  name: string
  countryName?: string
  rideCount: number
}

function sortedStops(ride: TransportListing) {
  return [...(ride.stops ?? [])].sort((a, b) => a.sort_order - b.sort_order)
}

export function aggregateCitiesFromRides(rides: TransportListing[]): CityHub[] {
  const map = new Map<number, CityHub>()
  for (const ride of rides) {
    for (const stop of ride.stops ?? []) {
      if (!stop.city_id) continue
      const existing = map.get(stop.city_id)
      if (existing) {
        existing.rideCount++
      } else {
        map.set(stop.city_id, {
          id: stop.city_id,
          slug: stop.city_slug ?? String(stop.city_id),
          name: stop.city_name ?? `Місто #${stop.city_id}`,
          countryName: stop.country_name,
          rideCount: 1,
        })
      }
    }
  }
  return [...map.values()].sort((a, b) => b.rideCount - a.rideCount || a.name.localeCompare(b.name, 'uk'))
}

export function ridesDepartingFrom(rides: TransportListing[], cityId: number) {
  return rides.filter((ride) => sortedStops(ride)[0]?.city_id === cityId)
}

export function ridesArrivingTo(rides: TransportListing[], cityId: number) {
  return rides.filter((ride) => {
    const stops = sortedStops(ride)
    return stops[stops.length - 1]?.city_id === cityId
  })
}

export function ridesPassingThrough(rides: TransportListing[], cityId: number) {
  return rides.filter((ride) => ride.stops?.some((s) => s.city_id === cityId))
}

export function routeLabel(stops: TransportListing['stops']) {
  if (!stops?.length) return '—'
  return [...stops].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.city_name).filter(Boolean).join(' → ')
}
