import type { DiscoverMapPoint } from '@gaido/api-client/api/types/discover'
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
        const title = p.provider_slug
          ? `<a href="/provider/${escapeHtml(p.provider_slug)}" class="font-semibold text-brand-700 hover:underline">${escapeHtml(p.title)}</a>`
          : `<strong>${escapeHtml(p.title)}</strong>`
        const lines = [
          title,
          p.provider_name ? escapeHtml(p.provider_name) : '',
          p.city_name ? `📍 ${escapeHtml(p.city_name)}${p.label ? ` · ${escapeHtml(p.label)}` : ''}` : escapeHtml(p.label),
          p.category_name ? escapeHtml(p.category_name) : '',
        ].filter(Boolean)
        const footer = p.provider_slug
          ? `<br><a href="/provider/${escapeHtml(p.provider_slug)}" class="text-sm text-brand-700 hover:underline">Переглянути картку →</a>`
          : ''
        return lines.join('<br>') + footer
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
