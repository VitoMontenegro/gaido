import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { createMarkerClusterGroup } from '../../lib/leafletCluster'
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  ensureLeafletIcons,
  bindPageFriendlyWheelZoom,
  denseFitPoints,
  fitLeafletMapToPoints,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MOBILE_FIT,
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
  showAttribution?: boolean
}

export default function LeafletMap<T extends LatLngPoint>({
  points,
  center,
  fitOptions,
  getTooltip,
  renderPopup,
  onMarkerClick,
  showAttribution = true,
}: LeafletMapProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const getTooltipRef = useRef(getTooltip)
  const renderPopupRef = useRef(renderPopup)

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
    getTooltipRef.current = getTooltip
    renderPopupRef.current = renderPopup
  }, [onMarkerClick, getTooltip, renderPopup])

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
      clusterRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const cluster = createMarkerClusterGroup()
    const markers = points.map((p) => {
      const marker = L.marker([p.lat, p.lng])

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

      return marker
    })
    cluster.addLayers(markers)
    cluster.addTo(map)
    clusterRef.current = cluster

    const mobile = window.matchMedia('(max-width: 639px)').matches
    const fitPoints: LatLngPoint[] = [...(mobile && !center ? denseFitPoints(points) : points)]
    if (center) fitPoints.push(center)

    if (fitPoints.length) {
      fitLeafletMapToPoints(map, fitPoints, mobile && !center ? MAP_MOBILE_FIT : fitOptions)
    } else if (center) {
      map.setView([center.lat, center.lng], fitOptions?.singleZoom ?? 13)
    } else {
      map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM)
    }

    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.removeLayer(cluster)
      if (clusterRef.current === cluster) clusterRef.current = null
    }
  }, [points, center?.lat, center?.lng, fitOptions?.singleZoom, fitOptions?.maxZoom, fitOptions?.padding])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="leaflet-map" />
      {showAttribution && (
        <p className="mt-2 hidden text-xs text-stone-500 sm:block">
          Клікніть на карту, щоб масштабувати колесом · OpenStreetMap
        </p>
      )}
    </div>
  )
}
