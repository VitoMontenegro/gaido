import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { MapPoint } from '../api/client'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

const DEFAULT_CENTER: L.LatLngExpression = [30, 20]
const DEFAULT_ZOOM = 2

function fitMapToPoints(map: L.Map, points: MapPoint[]) {
  if (!points.length) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    return
  }
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 10)
    return
  }
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 4 })
}

type Props = {
  points: MapPoint[]
}

export default function CitiesMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer)
    })

    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng])
        .addTo(map)
        .bindPopup(
          `<strong>${p.name}</strong><br/><a href="/city/${p.slug}">Гіди та екскурсії →</a>`,
        )
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -28] })
    })

    if (points.length) {
      fitMapToPoints(map, points)
    }
  }, [points])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="leaflet-map" />
      <p className="mt-2 text-xs text-stone-500">
        Карта OpenStreetMap — без API-ключа.
      </p>
    </div>
  )
}
