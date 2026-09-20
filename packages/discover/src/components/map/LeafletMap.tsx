import L from 'leaflet'
import { useEffect, useRef } from 'react'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  ensureLeafletIcons,
  bindPageFriendlyWheelZoom,
  fitLeafletMapToPoints,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  type LatLngPoint,
} from '../../lib/leafletDefaults'

export type LeafletFitOptions = {
  singleZoom?: number
  maxZoom?: number
  padding?: [number, number]
}

export type LeafletMapProps<T extends LatLngPoint> = {
  points: T[]
  center?: { lat: number; lng: number } | null
  fitOptions?: LeafletFitOptions
  getTooltip?: (point: T) => string
  renderPopup?: (point: T) => HTMLElement | string
  onMarkerClick?: (point: T) => void
  onMapClick?: (lat: number, lng: number) => void
  showAttribution?: boolean
  compact?: boolean
}

export default function LeafletMap<T extends LatLngPoint>({
  points,
  center,
  fitOptions,
  getTooltip,
  renderPopup,
  onMarkerClick,
  onMapClick,
  showAttribution = true,
  compact = false,
}: LeafletMapProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onMapClickRef = useRef(onMapClick)
  const getTooltipRef = useRef(getTooltip)
  const renderPopupRef = useRef(renderPopup)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
    onMapClickRef.current = onMapClick
    getTooltipRef.current = getTooltip
    renderPopupRef.current = renderPopup
  }, [onMarkerClick, onMapClick, getTooltip, renderPopup])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    ensureLeafletIcons()

    const map = L.map(containerRef.current, {
      center: center ? [center.lat, center.lng] : MAP_DEFAULT_CENTER,
      zoom: center ? (fitOptions?.singleZoom ?? 13) : MAP_DEFAULT_ZOOM,
      scrollWheelZoom: false,
    })

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    const unbindWheel = bindPageFriendlyWheelZoom(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
    })

    const fixSize = () => map.invalidateSize()
    requestAnimationFrame(fixSize)
    window.addEventListener('resize', fixSize)

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fixSize)
      ro.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', fixSize)
      ro?.disconnect()
      unbindWheel()
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
      const marker = L.marker([p.lat, p.lng]).addTo(map)

      const tooltip = getTooltipRef.current?.(p)
      if (tooltip) {
        marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -28] })
      }

      const popup = renderPopupRef.current?.(p)
      if (popup !== undefined) {
        marker.bindPopup(popup)
      }

      if (onMarkerClickRef.current) {
        marker.on('click', () => onMarkerClickRef.current?.(p))
      }
    })

    const fitPoints: LatLngPoint[] = [...points]
    if (center) fitPoints.push(center)

    if (fitPoints.length) {
      fitLeafletMapToPoints(map, fitPoints, fitOptions)
    } else if (center) {
      map.setView([center.lat, center.lng], fitOptions?.singleZoom ?? 13)
    } else {
      map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM)
    }

    requestAnimationFrame(() => map.invalidateSize())
  }, [points, center?.lat, center?.lng, fitOptions?.singleZoom, fitOptions?.maxZoom, fitOptions?.padding])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className={compact ? 'leaflet-map leaflet-map-sm' : 'leaflet-map'} />
      {showAttribution && (
        <p className="mt-2 text-xs text-stone-500">
          {onMapClick
            ? 'Клікніть на карті, щоб поставити точку · OpenStreetMap'
            : 'Клікніть на карту, щоб масштабувати колесом · OpenStreetMap'}
        </p>
      )}
    </div>
  )
}
