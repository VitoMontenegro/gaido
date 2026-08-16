import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '@gaido/api-client/api/discover'
import { FORMAT_LABELS, LANG_LABELS, RESPONSE_LABELS } from '@gaido/api-client/api/types/discover'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function ProviderPage() {
  const { slug = '' } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['provider', slug],
    queryFn: () => discoverApi.provider(slug),
    enabled: Boolean(slug),
  })

  if (isLoading) return <div className="container-site py-12 text-muted">Завантаження…</div>
  if (isError || !data) return <div className="container-site py-12">Профіль не знайдено.</div>

  const langs = (data.languages ?? []).map((l) => LANG_LABELS[l] ?? l).join(' · ')

  return (
    <>
      <Seo title={pageTitle(data.display_name)} description={data.about.slice(0, 160)} path={`/provider/${slug}`} />
      <div className="container-site space-y-8 py-10">
        <header className="grid gap-6 md:grid-cols-[120px_1fr]">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="h-28 w-28 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-sand-100 text-3xl">👤</div>
          )}
          <div>
            <h1 className="section-title">{data.display_name}</h1>
            {data.business_name && data.business_name !== data.display_name && (
              <p className="text-muted">{data.business_name}</p>
            )}
            {data.profession && <p className="mt-1 text-brand-700">{data.profession}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
              <span>⭐ {data.rating_avg.toFixed(1)} · {data.rating_count} відгуків</span>
              {data.response_hours && (
                <span>⏱ {RESPONSE_LABELS[data.response_hours] ?? data.response_hours}</span>
              )}
              {data.has_verified_docs && <span className="text-green-700">✓ Профіль перевірено</span>}
            </div>
            {langs && <p className="mt-2 text-sm">🗣 {langs}</p>}
          </div>
        </header>

        {data.about && (
          <section className="card p-6">
            <h2 className="section-title-sm mb-3">Про спеціаліста</h2>
            <p className="whitespace-pre-wrap text-muted">{data.about}</p>
          </section>
        )}

        <section>
          <h2 className="section-title-sm mb-4">Послуги</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.offerings.map((o) => (
              <article key={o.id} className="card p-4">
                <h3 className="font-medium text-ink">{o.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{o.description}</p>
                <p className="mt-2 text-sm text-muted">
                  {o.formats.map((f) => FORMAT_LABELS[f] ?? f).join(' · ')}
                </p>
              </article>
            ))}
          </div>
        </section>

        {data.points.length > 0 && (
          <section>
            <h2 className="section-title-sm mb-4">📍 Місця</h2>
            <ul className="space-y-2">
              {data.points.map((p) => (
                <li key={p.id} className="card p-4 text-sm">
                  <strong>{p.label}</strong>
                  {p.district && <span className="text-muted"> · {p.district}</span>}
                  {p.hours_text && <p className="text-muted">{p.hours_text}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-6">
          <h2 className="section-title-sm mb-3">Контакти</h2>
          {data.contacts_unlocked ? (
            <ul className="space-y-1 text-sm">
              {data.phone && <li>📞 {data.phone}</li>}
              {data.email && <li>✉️ {data.email}</li>}
              {data.telegram && <li>Telegram: {data.telegram}</li>}
              {data.whatsapp && <li>WhatsApp: {data.whatsapp}</li>}
              {data.viber && <li>Viber: {data.viber}</li>}
              {data.instagram && <li>Instagram: {data.instagram}</li>}
              {data.facebook && <li>Facebook: {data.facebook}</li>}
              {data.website && (
                <li>
                  <a href={data.website} className="link-accent" target="_blank" rel="noreferrer">
                    {data.website}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Контактні дані доступні постачальникам з активною підпискою.
            </p>
          )}
        </section>

        <Link to="/discover" className="link-accent text-sm">
          ← Усі пропозиції поруч
        </Link>
      </div>
    </>
  )
}
