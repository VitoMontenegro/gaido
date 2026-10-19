import L from 'leaflet'
import type { MapPoint } from '@gaido/api-client/api/client'
import LeafletMap from './map/LeafletMap'

const WORLD_FIT = { singleZoom: 4, maxZoom: 5, padding: [48, 48] as [number, number] }

type Props = {
  points: MapPoint[]
  showAttribution?: boolean
}

export default function CitiesMap({ points, showAttribution = true }: Props) {
  return (
    <LeafletMap
      points={points}
      showAttribution={showAttribution}
      fitOptions={WORLD_FIT}
      getTooltip={(p) => p.name}
      renderPopup={(p) => {
        const popup = L.DomUtil.create('div')
        const title = L.DomUtil.create('strong', '', popup)
        title.textContent = p.name
        L.DomUtil.create('br', '', popup)
        const link = L.DomUtil.create('a', '', popup) as HTMLAnchorElement
        link.href = `/city/${encodeURIComponent(p.slug)}`
        link.textContent = 'Гіди та екскурсії →'
        return popup
      }}
    />
  )
}
