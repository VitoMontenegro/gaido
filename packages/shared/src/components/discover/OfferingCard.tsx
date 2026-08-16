import { Link } from 'react-router-dom'
import type { DiscoverOffering } from '../../api/types/discover'
import { FORMAT_LABELS, LANG_LABELS, RESPONSE_LABELS } from '../../api/types/discover'
import { formatOfferingLocation } from '../../lib/geo'

type Props = {
  item: DiscoverOffering
  compact?: boolean
  onSelect?: () => void
}

export default function OfferingCard({ item, compact, onSelect }: Props) {
  const formats = item.formats.map((f) => FORMAT_LABELS[f] ?? f).join(' · ')
  const langs = item.languages.map((l) => LANG_LABELS[l] ?? l).join(' · ')
  const location = formatOfferingLocation(item)
  const response = RESPONSE_LABELS[item.provider.response_hours]
  const isOnline = item.formats.includes('online')

  return (
    <article
      className={`card flex flex-col gap-2 p-4 transition hover:shadow-md ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted">
            {item.category_name}
            {item.service_name ? ` · ${item.service_name}` : ''}
          </p>
          <h3 className="font-display font-medium text-ink">
            <Link to={`/provider/${item.provider.website_slug}`} className="hover:text-brand-700">
              {item.title}
            </Link>
          </h3>
          <p className="text-sm text-muted">{item.provider.display_name}</p>
        </div>
        {item.has_verified_docs && (
          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800">✓</span>
        )}
      </div>
      {!compact && item.description && (
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
      )}
      <div className="space-y-1 text-sm text-muted">
        {location ? (
          <p className="font-medium text-ink">📍 {location}</p>
        ) : isOnline ? (
          <p className="font-medium text-ink">🌐 Онлайн · без адреси</p>
        ) : null}
        {formats && <p>{formats}</p>}
        {langs && <p>🗣 {langs}</p>}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink">⭐ {item.rating_avg.toFixed(1)}</span>
        <span className="text-muted">· {item.rating_count} відгуків</span>
        {response && <span className="text-muted">· ⏱ {response}</span>}
        {item.has_availability && <span className="text-green-700">· 📅 Є вільні години</span>}
      </div>
    </article>
  )
}
