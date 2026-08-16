import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { providerApi, discoverApi } from '@gaido/api-client/api/discover'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { Seo } from '../../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

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

  const [regName, setRegName] = useState('')
  const [regSlug, setRegSlug] = useState('')

  const registerMut = useMutation({
    mutationFn: () => providerApi.register(regName, regSlug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-account'] }),
  })

  if (isLoading) return <div className="container-site py-12">Завантаження…</div>

  if (!data?.profile) {
    return (
      <>
        <Seo title={pageTitle('Кабінет постачальника')} path="/account/provider" />
        <div className="container-site max-w-lg space-y-4 py-10">
          <h1 className="section-title">Стати постачальником</h1>
          <input className="input" placeholder="Назва / ім'я" value={regName} onChange={(e) => setRegName(e.target.value)} />
          <input className="input" placeholder="slug-url" value={regSlug} onChange={(e) => setRegSlug(e.target.value)} />
          <button type="button" className="btn-primary" onClick={() => registerMut.mutate()} disabled={registerMut.isPending}>
            Зареєструвати профіль
          </button>
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
          <h1 className="section-title">{p.display_name}</h1>
          <Link to={`/provider/${p.website_slug}`} className="link-accent text-sm">
            Публічний профіль →
          </Link>
        </div>
        <ProviderOfferingForm categories={categories?.items ?? []} providerId={p.id} onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })} />
        <ProviderPointForm onSaved={() => qc.invalidateQueries({ queryKey: ['provider-account'] })} />
        <section>
          <h2 className="section-title-sm mb-3">Ваші послуги</h2>
          <ul className="space-y-2">
            {(data.offerings as Array<{ id: number; title: string; status: string }>).map((o) => (
              <li key={o.id} className="card p-3 text-sm">
                {o.title} · {o.status}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title-sm mb-3">Точки</h2>
          <ul className="space-y-2">
            {(data.points as Array<{ id: number; label: string }>).map((pt) => (
              <li key={pt.id} className="card p-3 text-sm">
                📍 {pt.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
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

function ProviderPointForm({ onSaved }: { onSaved: () => void }) {
  const [label, setLabel] = useState('')
  const [lat, setLat] = useState('52.52')
  const [lng, setLng] = useState('13.405')
  const [cityId, setCityId] = useState<number | undefined>()
  const { data: cities } = useQuery({ queryKey: ['cities-all'], queryFn: () => catalogApi.cities() })
  const mut = useMutation({
    mutationFn: () =>
      providerApi.upsertPoint({
        label,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        city_id: cityId,
        address_visibility: 'district',
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
      <h2 className="font-medium">Додати точку</h2>
      <input className="input" placeholder="Назва (район)" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <select className="input" onChange={(e) => setCityId(Number(e.target.value) || undefined)}>
        <option value="">Місто</option>
        {(cities?.items ?? []).slice(0, 200).map((c: { id: number; name: string }) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} />
        <input className="input" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary" disabled={mut.isPending}>
        Зберегти точку
      </button>
    </form>
  )
}
