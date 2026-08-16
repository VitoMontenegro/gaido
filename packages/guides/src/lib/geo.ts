export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatOfferingLocation(item: {
  city_name?: string
  point_label?: string
  point_district?: string
  distance_km?: number | null
}) {
  const parts: string[] = []
  if (item.city_name) parts.push(item.city_name)
  if (item.point_district) parts.push(item.point_district)
  else if (item.point_label && item.point_label !== item.city_name) parts.push(item.point_label)
  if (item.distance_km != null) parts.push(`${item.distance_km.toFixed(1)} км`)
  return parts.join(' · ')
}
