import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'

const CLUSTER_DISABLE_ZOOM = 11

function clusterRadiusForZoom(zoom: number): number {
  const mobile = window.matchMedia('(max-width: 639px)').matches
  if (zoom <= 3) return mobile ? 56 : 64
  if (zoom <= 5) return mobile ? 44 : 52
  if (zoom <= 7) return mobile ? 36 : 40
  if (zoom <= 9) return mobile ? 32 : 32
  return mobile ? 28 : 28
}

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 'sm' : count < 30 ? 'md' : 'lg'
  const dim = size === 'sm' ? 36 : size === 'md' ? 44 : 52
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `leaflet-div-icon gaido-cluster gaido-cluster--${size}`,
    iconSize: [dim, dim],
    iconAnchor: [dim / 2, dim / 2],
  })
}

export function createMarkerClusterGroup(): L.MarkerClusterGroup {
  return L.markerClusterGroup({
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: CLUSTER_DISABLE_ZOOM,
    maxClusterRadius: clusterRadiusForZoom,
    iconCreateFunction: clusterIcon,
  })
}
