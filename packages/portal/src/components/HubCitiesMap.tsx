import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import { guidesUrl } from '@gaido/site-urls/site'
import LeafletMap from './map/LeafletMap'

const WORLD_FIT = { singleZoom: 4, maxZoom: 5, padding: [48, 48] as [number, number] }

export default function HubCitiesMap() {
  const { data, isLoading } = useQuery({
    queryKey: ['map-points'],
    queryFn: () => catalogApi.mapPoints(),
    staleTime: 60_000,
  })
  const points = data?.items ?? []

  if (isLoading && points.length === 0) {
    return <div className="h-full w-full animate-pulse bg-sand-100" aria-label="Завантаження карти" />
  }
  if (points.length === 0) return <div className="h-full w-full bg-sand-100" />

  return (
    <div className="h-full w-full">
    <LeafletMap
      points={points}
      fitOptions={WORLD_FIT}
      getTooltip={(p) => p.name}
      renderPopup={(p) => {
        const popup = L.DomUtil.create('div')
        const title = L.DomUtil.create('strong', '', popup)
        title.textContent = p.name
        L.DomUtil.create('br', '', popup)
        const link = L.DomUtil.create('a', '', popup) as HTMLAnchorElement
        link.href = guidesUrl(`/city/${encodeURIComponent(p.slug)}`)
        link.textContent = 'Гіди та екскурсії →'
        return popup
      }}
    />
    </div>
  )
}
