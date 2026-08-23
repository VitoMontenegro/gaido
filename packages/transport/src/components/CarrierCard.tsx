import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import type { CarrierProfile } from '@gaido/api-client/api/types/carrier'
import { carrierTypeNames } from '../lib/carrierLabels'
import type { CarrierType } from '@gaido/api-client/api/types/carrier'

function CarrierAvatar({ carrier, className }: { carrier: CarrierProfile; className?: string }) {
  const name = carrier.display_name || carrier.business_name || carrier.contact_person || 'П'
  const avatar = carrier.avatar_url ? resolveMediaUrl(carrier.avatar_url) : null
  if (avatar) {
    return <img src={avatar} alt="" className={className} />
  }
  return (
    <div className={`flex items-center justify-center bg-sand-100 text-2xl font-semibold text-teal ${className ?? ''}`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export default function CarrierCard({ carrier, compact }: { carrier: CarrierProfile; compact?: boolean }) {
  const slug = carrier.website_slug
  if (!slug) return null

  const title = carrier.display_name || carrier.business_name || carrier.contact_person || 'Перевізник'
  const typeName = carrierTypeNames[carrier.carrier_type as CarrierType] || carrier.carrier_type

  if (compact) {
    return (
      <Link
        to={`/carriers/${slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <CarrierAvatar carrier={carrier} className="aspect-[4/3] w-full object-cover" />
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-teal">{title}</h3>
          <span className="mt-1 inline-flex w-fit rounded-md bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-dark">
            {typeName}
          </span>
          {carrier.base_city_name && (
            <p className="mt-1 text-xs text-muted">{carrier.base_city_name}</p>
          )}
          <p className="mt-auto pt-2 text-xs text-muted-light">
            {carrier.rating_count ? `★ ${carrier.rating_avg?.toFixed(1)} · ${carrier.rating_count}` : 'Новий перевізник'}
            {carrier.verified_ukrainian ? ' · 🇺🇦' : ''}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/carriers/${slug}`}
      className="group card flex gap-4 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <CarrierAvatar carrier={carrier} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0">
        <h3 className="font-display font-medium uppercase text-ink group-hover:text-brand-700">{title}</h3>
        <span className="badge-teal mt-2">{typeName}</span>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {carrier.about || (carrier.base_city_name ? `База: ${carrier.base_city_name}` : 'Міжнародні перевезення')}
        </p>
        <p className="mt-2 text-sm text-muted-light">
          {carrier.rating_count ? `★ ${carrier.rating_avg?.toFixed(1)} · ${carrier.rating_count} відгуків` : 'Без відгуків'}
          {carrier.verified_ukrainian ? ' · 🇺🇦 верифікований' : ''}
        </p>
      </div>
    </Link>
  )
}

export function CarrierCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 ${className ?? ''}`}>
      {children}
    </div>
  )
}
