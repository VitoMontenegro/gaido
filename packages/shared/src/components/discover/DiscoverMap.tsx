import type { DiscoverMapPoint } from '../../api/types/discover'
import LeafletMap from '../map/LeafletMap'

const DISCOVER_FIT = { singleZoom: 13, maxZoom: 15, padding: [56, 56] as [number, number] }

type Props = {
  points: DiscoverMapPoint[]
  center?: { lat: number; lng: number } | null
  onSelect?: (point: DiscoverMapPoint) => void
}

export default function DiscoverMap({ points, center, onSelect }: Props) {
  return (
    <LeafletMap
      points={points}
      center={center}
      fitOptions={DISCOVER_FIT}
      getTooltip={(p) => {
        const city = p.city_name ? `${p.city_name} · ` : ''
        return `${city}${p.title}`
      }}
      renderPopup={(p) => {
        const lines = [
          `<strong>${escapeHtml(p.title)}</strong>`,
          p.provider_name ? escapeHtml(p.provider_name) : '',
          p.city_name ? `📍 ${escapeHtml(p.city_name)}${p.label ? ` · ${escapeHtml(p.label)}` : ''}` : escapeHtml(p.label),
          p.category_name ? escapeHtml(p.category_name) : '',
        ].filter(Boolean)
        return lines.join('<br>')
      }}
      onMarkerClick={onSelect}
    />
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
