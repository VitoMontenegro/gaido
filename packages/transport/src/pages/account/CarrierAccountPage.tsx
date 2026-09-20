import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { carrierApi } from '@gaido/api-client/api/carrier'
import { formatApiError } from '@gaido/api-client/api/http'
import type {
  CarrierAccount,
  CarrierProfileInput,
  CarrierType,
  CarrierVehicleInput,
} from '@gaido/api-client/api/types/carrier'
import CitySelect from '../../components/CitySelect'
import { carrierTypeNames } from '../../lib/carrierLabels'

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

function profileToInput(data?: CarrierAccount | null): CarrierProfileInput {
  const p = data?.profile
  const hint = data?.identity_hint
  return {
    carrier_type: p?.carrier_type ?? 'private',
    citizenship: p?.citizenship ?? 'UA',
    status: p?.status ?? 'published',
    display_name: p?.display_name || hint?.display_name || p?.contact_person || '',
    website_slug: p?.website_slug || data?.website_slug || hint?.website_slug || '',
    about: p?.about || '',
    base_city_id: p?.base_city_id,
    phone: p?.phone || '',
    telegram: p?.telegram || '',
    email: p?.email || '',
    contact_person: p?.contact_person || p?.display_name || hint?.display_name || '',
    business_name: p?.business_name || '',
    experience_years: p?.experience_years,
    trips_count: p?.trips_count,
  }
}

export default function CarrierAccountPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const nextPath =
    location.state && typeof location.state === 'object' && 'next' in location.state
      ? String((location.state as { next?: string }).next)
      : undefined
  const afterSavePath = nextPath?.startsWith('/account/') ? nextPath : undefined
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['carrier-account'],
    queryFn: () => carrierApi.account(),
  })
  const [edits, setEdits] = useState<Partial<CarrierProfileInput>>({})
  const [slugTouched, setSlugTouched] = useState(false)
  const [vehicle, setVehicle] = useState<CarrierVehicleInput>({
    brand: '',
    seats: 7,
    vehicle_type: 'minivan',
    is_primary: true,
  })

  const form: CarrierProfileInput = { ...profileToInput(data), ...edits }
  const slugLocked = slugTouched || Boolean(profileToInput(data).website_slug)
  const patch = (next: Partial<CarrierProfileInput>) => setEdits((prev) => ({ ...prev, ...next }))

  const saveProfile = useMutation({
    mutationFn: () => carrierApi.saveProfile(form),
    onSuccess: async () => {
      setEdits({})
      await qc.invalidateQueries({ queryKey: ['carrier-account'] })
      await qc.invalidateQueries({ queryKey: ['me'] })
      if (afterSavePath) navigate(afterSavePath)
    },
  })

  const addVehicle = useMutation({
    mutationFn: () => carrierApi.createVehicle(vehicle),
    onSuccess: () => {
      setVehicle({ brand: '', seats: 7, vehicle_type: 'minivan', is_primary: true })
      qc.invalidateQueries({ queryKey: ['carrier-account'] })
    },
  })

  if (isLoading) return <p className="text-muted">Завантаження…</p>
  if (isError) {
    return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Не вдалося завантажити профіль'}</p>
  }

  const profile = data?.profile
  const slug = form.website_slug?.trim() || data?.website_slug
  const vehicles = data?.vehicles ?? []
  const preview = slug || suggestSlug(form.display_name || '')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="section-title-sm">Профіль перевізника</h1>
        <p className="text-sm text-muted">
          {profile
            ? 'Контакти на публічній сторінці видно одразу після збереження профілю.'
            : 'Спочатку заповніть профіль перевізника — після цього можна додати рейс.'}
        </p>
      </div>

      {profile && (
        <div className="card space-y-2 p-4 text-sm">
          <p>
            Статус: <strong>{profile.status}</strong>
          </p>
          {slug && (
            <Link to={`/carriers/${slug}`} className="text-brand-700 hover:underline">
              {profile.status === 'published' ? 'Публічний профіль →' : 'Переглянути профіль →'}
            </Link>
          )}
        </div>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Тип перевізника</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(carrierTypeNames) as CarrierType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`rounded-lg border p-3 text-left text-sm ${form.carrier_type === t ? 'border-brand-500 bg-brand-50' : 'border-sand-200'}`}
              onClick={() => patch({ carrier_type: t })}
            >
              {carrierTypeNames[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Профіль</h2>
        <label className="block space-y-1 text-sm">
          <span>Імʼя для відображення</span>
          <input
            className="input"
            value={form.display_name || ''}
            onChange={(e) => {
              const next = e.target.value
              patch({
                display_name: next,
                ...(slugLocked ? {} : { website_slug: suggestSlug(next) }),
              })
            }}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Адреса профілю</span>
          <input
            className="input"
            value={form.website_slug || ''}
            placeholder={suggestSlug(form.display_name || '') || 'авто з імені'}
            onChange={(e) => {
              setSlugTouched(true)
              patch({ website_slug: e.target.value })
            }}
          />
          <span className="text-muted">
            {preview
              ? `/carriers/${preview}`
              : 'Якщо порожньо — з імені. Якщо зайнято в цьому сервісі, збереження не пройде.'}
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Про перевізника</span>
          <textarea className="input min-h-24" value={form.about || ''} onChange={(e) => patch({ about: e.target.value })} />
        </label>
        <CitySelect
          label="Базове місто"
          value={form.base_city_id}
          onChange={(id: number) => patch({ base_city_id: id })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Телефон</span>
            <input className="input" value={form.phone || ''} onChange={(e) => patch({ phone: e.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Telegram</span>
            <input className="input" value={form.telegram || ''} onChange={(e) => patch({ telegram: e.target.value })} />
          </label>
        </div>
        {saveProfile.isError && (
          <p className="text-sm text-red-600">{formatApiError(saveProfile.error)}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-accent"
            disabled={saveProfile.isPending || !form.display_name?.trim()}
            onClick={() => saveProfile.mutate()}
          >
            Зберегти профіль
          </button>
          {profile && (
            <Link to="/account/rides/new" className="btn-secondary">
              Додати рейс
            </Link>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Транспорт</h2>
        {vehicles.length > 0 && (
          <ul className="space-y-1 text-sm">
            {vehicles.map((v) => (
              <li key={v.id}>{[v.brand, v.model].filter(Boolean).join(' ')} · {v.seats} місць</li>
            ))}
          </ul>
        )}
        {!profile && (
          <p className="text-sm text-muted">Спочатку збережіть профіль — тоді можна додати авто.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Марка</span>
            <input className="input" disabled={!profile} value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Модель</span>
            <input className="input" disabled={!profile} value={vehicle.model || ''} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Місць</span>
            <input className="input" disabled={!profile} type="number" value={vehicle.seats || 4} onChange={(e) => setVehicle({ ...vehicle, seats: Number(e.target.value) })} />
          </label>
        </div>
        {addVehicle.isError && (
          <p className="text-sm text-red-600">{formatApiError(addVehicle.error)}</p>
        )}
        <button type="button" className="btn-accent" disabled={!profile || addVehicle.isPending || !vehicle.brand} onClick={() => addVehicle.mutate()}>
          Додати авто
        </button>
      </section>
    </div>
  )
}
