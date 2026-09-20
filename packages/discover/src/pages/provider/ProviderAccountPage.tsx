import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { providerApi, discoverApi } from '@gaido/api-client/api/discover'
import { formatApiError } from '@gaido/api-client/api/http'
import { Seo } from '../../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'
import PointLocationForm from '../../components/provider/PointLocationForm'

function suggestSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function ProviderAccountPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['provider-account'],
    queryFn: () => providerApi.account(),
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => discoverApi.categories(),
  })

  if (isLoading) return <div className="container-site py-12">Завантаження…</div>

  if (!data?.profile) {
    return (
      <>
        <Seo title={pageTitle('Кабінет постачальника')} path="/account/provider" />
        <div className="container-site max-w-lg space-y-4 py-10">
          <h1 className="section-title">Стати постачальником</h1>
          <ProviderIdentityForm
            key={`${data.identity_hint?.display_name ?? ''}:${data.identity_hint?.website_slug ?? ''}`}
            displayName={data.identity_hint?.display_name ?? ''}
            websiteSlug={data.identity_hint?.website_slug ?? ''}
            onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })}
          />
        </div>
      </>
    )
  }

  const p = data.profile
  return (
    <>
      <Seo title={pageTitle('Кабінет постачальника')} path="/account/provider" />
      <div className="container-site space-y-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="section-title">{p.display_name}</h1>
            <p className="mt-1 text-sm text-muted">Статус: {p.status}</p>
          </div>
          <Link to={`/provider/${p.website_slug}`} className="link-accent text-sm">
            {p.status === 'verified' || p.status === 'moderation' ? 'Публічний профіль →' : 'Переглянути профіль →'}
          </Link>
        </div>
        <ProviderIdentityForm
          isEdit
          displayName={p.display_name}
          websiteSlug={p.website_slug}
          onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })}
        />
        <ProviderOfferingForm categories={categories?.items ?? []} providerId={p.id} onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })} />
        <PointLocationForm onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })} />
        <section>
          <h2 className="section-title-sm mb-3">Ваші послуги</h2>
          <ul className="space-y-2">
            {(data.offerings ?? []).map((o: { id: number; title: string; status: string }) => (
              <li key={o.id} className="card p-3 text-sm">
                {o.title} · {o.status}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title-sm mb-3">Точки</h2>
          <ul className="space-y-2">
            {(data.points ?? []).map((pt: { id: number; label: string; address_text?: string }) => (
              <li key={pt.id} className="card p-3 text-sm">
                📍 {pt.label}
                {pt.address_text && pt.address_text !== pt.label ? (
                  <span className="text-muted"> · {pt.address_text}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

function ProviderIdentityForm({
  isEdit = false,
  displayName = '',
  websiteSlug = '',
  onSaved,
}: {
  isEdit?: boolean
  displayName?: string
  websiteSlug?: string
  onSaved: () => void
}) {
  const [name, setName] = useState(displayName)
  const [slug, setSlug] = useState(websiteSlug)
  const [slugTouched, setSlugTouched] = useState(Boolean(websiteSlug))

  const mut = useMutation({
    mutationFn: () =>
      isEdit
        ? providerApi.updateProfile({ display_name: name.trim(), website_slug: slug.trim() })
        : providerApi.register(name.trim(), slug.trim()),
    onSuccess: (res) => {
      if (res && 'website_slug' in res && res.website_slug) setSlug(res.website_slug)
      onSaved()
    },
  })

  const preview = slug.trim() || suggestSlug(name)

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        mut.mutate()
      }}
    >
      <h2 className="font-medium">Профіль</h2>
      <label className="block space-y-1 text-sm">
        <span>Імʼя для відображення</span>
        <input
          className="input"
          value={name}
          required
          onChange={(e) => {
            const next = e.target.value
            setName(next)
            if (!slugTouched) setSlug(suggestSlug(next))
          }}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Адреса профілю</span>
        <input
          className="input"
          value={slug}
          placeholder={suggestSlug(name) || 'авто з імені'}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
        />
        <span className="text-muted">
          {preview
            ? `/provider/${preview}`
            : 'Якщо порожньо — з імені. Якщо зайнято, додамо випадковий числовий префікс.'}
        </span>
      </label>
      {mut.isError && (
        <p className="text-sm text-red-600">{formatApiError(mut.error)}</p>
      )}
      <button type="submit" className="btn-primary" disabled={mut.isPending || !name.trim()}>
        {mut.isPending ? 'Збереження…' : isEdit ? 'Зберегти профіль' : 'Зареєструвати профіль'}
      </button>
    </form>
  )
}

function ProviderOfferingForm({
  categories,
  onSaved,
}: {
  categories: Array<{ id: number; slug: string; name: string }>
  providerId: number
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [description, setDescription] = useState('')
  const mut = useMutation({
    mutationFn: () =>
      providerApi.upsertOffering({
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        category_id: categoryId,
        description,
        formats: ['on_site'],
        languages: ['uk'],
        status: 'published',
      }),
    onSuccess: onSaved,
  })

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        mut.mutate()
      }}
    >
      <h2 className="font-medium">Додати послугу</h2>
      <input className="input" placeholder="Назва" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} required>
        <option value={0}>Категорія</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea className="input" placeholder="Опис" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit" className="btn-primary" disabled={mut.isPending}>
        Зберегти
      </button>
    </form>
  )
}
