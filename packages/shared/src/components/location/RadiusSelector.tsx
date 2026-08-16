import { RADIUS_OPTIONS } from '../../api/types/discover'
import { useLocation } from '../../contexts/LocationContext'

export default function RadiusSelector() {
  const loc = useLocation()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Місто та поруч:</span>
      {RADIUS_OPTIONS.map((km) => (
        <button
          key={km}
          type="button"
          className={`rounded-full px-3 py-1 text-sm transition ${
            loc.radiusKm === km ? 'bg-ink text-white' : 'bg-sand-100 text-ink hover:bg-sand-200'
          }`}
          onClick={() => loc.setRadius(km)}
        >
          {km} км
        </button>
      ))}
    </div>
  )
}
