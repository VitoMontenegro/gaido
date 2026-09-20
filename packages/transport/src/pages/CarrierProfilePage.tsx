import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { carrierApi } from '@gaido/api-client/api/carrier'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import { pageTitle } from '@gaido/site-urls/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import RideCard from '../components/RideCard'
import { carrierTypeNames, verificationBadge } from '../lib/carrierLabels'
import { Seo } from '../lib/seo'
import type { CarrierType } from '@gaido/api-client/api/types/carrier'

function ContactRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <p className="text-sm">
      <span className="text-muted">{label}: </span>
      <span className="font-medium text-ink">{value}</span>
    </p>
  )
}

export default function CarrierProfilePage() {
  const { slug = '' } = useParams()
  const { data: carrier, isLoading, isError } = useQuery({
    queryKey: ['carrier', slug],
    queryFn: () => carrierApi.get(slug),
    enabled: Boolean(slug),
  })

  if (isLoading) return <div className="container-site py-12 text-muted">Завантаження…</div>
  if (isError || !carrier) return <div className="container-site py-12 text-muted">Перевізника не знайдено</div>

  const title = carrier.display_name || carrier.business_name || carrier.contact_person || 'Перевізник'
  const typeName = carrierTypeNames[carrier.carrier_type as CarrierType] || carrier.carrier_type
  const avatar = carrier.avatar_url ? resolveMediaUrl(carrier.avatar_url) : null
  const description = carrier.about
    ? `${title} — ${typeName}. ${carrier.about.slice(0, 120)}`
    : `${title} — ${typeName}${carrier.base_city_name ? `, база ${carrier.base_city_name}` : ''}. Міжнародні перевезення на Vezu.`
  const hasContacts = Boolean(
    carrier.phone || carrier.telegram || carrier.whatsapp || carrier.viber || carrier.email,
  )

  return (
    <>
      <Seo title={pageTitle(title)} description={description} path={`/carriers/${carrier.website_slug}`} />
      <Breadcrumbs items={[{ label: 'Перевізники', to: '/carriers' }, { label: title }]} />
      <div className="container-site max-w-4xl space-y-6 py-10">
        {carrier.preview && (
          <p className="rounded-lg bg-sand-100 px-4 py-3 text-sm text-muted">
            Це попередній перегляд. Профіль ще не в каталозі (статус: {carrier.status}).
          </p>
        )}
        <div className="card flex flex-wrap gap-4 p-5">
          {avatar ? (
            <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sand-100 text-3xl">🚐</div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="section-title-sm">{title}</h1>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800">{typeName}</span>
              {carrier.verified_ukrainian && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800">🇺🇦 верифікований</span>
              )}
            </div>
            {carrier.base_city_name && (
              <p className="text-sm text-muted">База: {carrier.base_city_name}</p>
            )}
            {carrier.hours_text && (
              <p className="text-sm text-muted">Графік: {carrier.hours_text}</p>
            )}
            {carrier.about && <p className="text-sm text-ink">{carrier.about}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              {carrier.experience_years > 0 && <span>{carrier.experience_years} років досвіду</span>}
              {carrier.trips_count > 0 && <span>{carrier.trips_count}+ рейсів</span>}
              {carrier.rating_count ? <span>★ {carrier.rating_avg?.toFixed(1)} ({carrier.rating_count})</span> : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {verificationBadge(carrier.identity_status) && (
                <span className="rounded bg-sand-100 px-2 py-0.5">Особа: {verificationBadge(carrier.identity_status)}</span>
              )}
              {verificationBadge(carrier.documents_status) && (
                <span className="rounded bg-sand-100 px-2 py-0.5">Документи: {verificationBadge(carrier.documents_status)}</span>
              )}
            </div>
          </div>
        </div>

        {carrier.vehicles && carrier.vehicles.length > 0 && (
          <section className="card space-y-3 p-5">
            <h2 className="font-medium text-ink">Транспорт</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {carrier.vehicles.map((v) => (
                <li key={v.id} className="rounded-lg border border-sand-200 p-3 text-sm">
                  <p className="font-medium">{v.brand} {v.model}{v.year ? ` (${v.year})` : ''}</p>
                  <p className="text-muted">{v.seats} місць · {v.vehicle_type}</p>
                  {v.description && <p className="mt-1 text-muted">{v.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {carrier.rides && carrier.rides.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-medium text-ink">Маршрути</h2>
            <div className="space-y-3">
              {carrier.rides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          </section>
        )}

        <section className="card space-y-3 p-5">
          <h2 className="font-medium text-ink">Контакти</h2>
          {hasContacts ? (
            <div className="space-y-1">
              <ContactRow label="Телефон" value={carrier.phone} />
              <ContactRow label="Telegram" value={carrier.telegram} />
              <ContactRow label="WhatsApp" value={carrier.whatsapp} />
              <ContactRow label="Viber" value={carrier.viber} />
              <ContactRow label="Email" value={carrier.email} />
            </div>
          ) : (
            <p className="text-sm text-muted">
              Контактів поки немає.
            </p>
          )}
        </section>

        {carrier.reviews && carrier.reviews.length > 0 && (
          <section className="card space-y-3 p-5">
            <h2 className="font-medium text-ink">Відгуки</h2>
            <ul className="space-y-3">
              {carrier.reviews.map((r) => (
                <li key={r.id} className="border-b border-sand-100 pb-3 text-sm last:border-0">
                  <p className="font-medium">★ {r.rating} · {r.author_name}</p>
                  <p className="text-muted">{r.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
