import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

export const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

let iconsReady = false

export function ensureLeafletIcons() {
  if (!iconsReady) {
    L.Marker.prototype.options.icon = defaultMarkerIcon
    iconsReady = true
  }
}

export const MAP_DEFAULT_CENTER: L.LatLngExpression = [30, 20]
export const MAP_DEFAULT_ZOOM = 2

export type LatLngPoint = { lat: number; lng: number }

export function fitLeafletMapToPoints(
  map: L.Map,
  points: LatLngPoint[],
  options?: { singleZoom?: number; maxZoom?: number; padding?: [number, number] },
) {
  const singleZoom = options?.singleZoom ?? 13
  const maxZoom = options?.maxZoom ?? 15
  const padding = options?.padding ?? [48, 48]

  if (!points.length) {
    map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM)
    return
  }
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], singleZoom)
    return
  }
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
  map.fitBounds(bounds, { padding, maxZoom })
}

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Wheel zoom only after click — page scroll works when cursor is over the map. */
export function bindPageFriendlyWheelZoom(map: L.Map): () => void {
  const container = map.getContainer()
  map.scrollWheelZoom.disable()

  const activate = () => {
    map.scrollWheelZoom.enable()
    container.classList.add('leaflet-map--wheel-active')
  }

  const deactivate = () => {
    map.scrollWheelZoom.disable()
    container.classList.remove('leaflet-map--wheel-active')
  }

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) activate()
  }

  container.addEventListener('click', activate)
  container.addEventListener('mouseleave', deactivate)
  container.addEventListener('wheel', onWheel, { passive: true })

  return () => {
    container.removeEventListener('click', activate)
    container.removeEventListener('mouseleave', deactivate)
    container.removeEventListener('wheel', onWheel)
  }
}
