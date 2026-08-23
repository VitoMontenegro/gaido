import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { carrierApi } from '@gaido/api-client/api/carrier'
import type { CarrierProfileInput, CarrierType, CarrierVehicleInput } from '@gaido/api-client/api/types/carrier'
import CitySelect from '../../components/CitySelect'
import { carrierTypeNames } from '../../lib/carrierLabels'

const STEPS = ['Тип', 'Профіль', 'Транспорт', 'Готово'] as const

export default function CarrierAccountPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['carrier-account'], queryFn: () => carrierApi.account() })
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CarrierProfileInput>({
    carrier_type: 'private',
    citizenship: 'UA',
    status: 'pending',
  })
  const [vehicle, setVehicle] = useState<CarrierVehicleInput>({ brand: '', seats: 7, vehicle_type: 'minivan', is_primary: true })

  const saveProfile = useMutation({
    mutationFn: () => carrierApi.saveProfile(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrier-account'] })
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    },
  })

  const addVehicle = useMutation({
    mutationFn: () => carrierApi.createVehicle(vehicle),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['carrier-account'] })
      setStep(3)
    },
  })

  if (isLoading) return <p className="text-muted">Завантаження…</p>

  const profile = data?.profile
  const slug = data?.website_slug

  return (
    <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="section-title-sm">Профіль перевізника</h1>
          <p className="text-sm text-muted">
            Заповніть профіль для модерації. Контакти стануть публічними після активації підписки Vezu.
          </p>
        </div>

        {profile && (
          <div className="card space-y-2 p-4 text-sm">
            <p>
              Статус: <strong>{profile.status}</strong>
              {data?.subscription_active ? ' · підписка активна' : ' · підписка не активна'}
            </p>
            {slug && (
              <Link to={`/carriers/${slug}`} className="text-brand-700 hover:underline">
                Публічний профіль →
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-2 text-xs">
          {STEPS.map((label, i) => (
            <span key={label} className={`rounded-full px-3 py-1 ${i === step ? 'bg-brand-100 text-brand-800' : 'bg-sand-100 text-muted'}`}>
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-medium">Тип перевізника</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(carrierTypeNames) as CarrierType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-lg border p-3 text-left text-sm ${form.carrier_type === t ? 'border-brand-500 bg-brand-50' : 'border-sand-200'}`}
                  onClick={() => setForm((f) => ({ ...f, carrier_type: t }))}
                >
                  {carrierTypeNames[t]}
                </button>
              ))}
            </div>
            <button type="button" className="btn-accent" onClick={() => setStep(1)}>Далі</button>
          </section>
        )}

        {step === 1 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-medium">Профіль</h2>
            <label className="block space-y-1 text-sm">
              <span>Назва / ПІБ</span>
              <input className="input" value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Про перевізника</span>
              <textarea className="input min-h-24" value={form.about || ''} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            </label>
            <CitySelect
              label="Базове місто"
              value={form.base_city_id}
              onChange={(id: number) => setForm({ ...form, base_city_id: id })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Телефон</span>
                <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Telegram</span>
                <input className="input" value={form.telegram || ''} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Назад</button>
              <button type="button" className="btn-accent" disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
                Зберегти і далі
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="card space-y-4 p-5">
            <h2 className="font-medium">Транспорт</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Марка</span>
                <input className="input" value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Модель</span>
                <input className="input" value={vehicle.model || ''} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Місць</span>
                <input className="input" type="number" value={vehicle.seats || 4} onChange={(e) => setVehicle({ ...vehicle, seats: Number(e.target.value) })} />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Назад</button>
              <button type="button" className="btn-accent" disabled={addVehicle.isPending || !vehicle.brand} onClick={() => addVehicle.mutate()}>
                Додати авто
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card space-y-3 p-5">
            <h2 className="font-medium">Профіль на модерації</h2>
            <p className="text-sm text-muted">
              Після схвалення модератором ваш профіль з&apos;явиться в каталозі. Додайте рейси в розділі «Мої рейси».
            </p>
            <Link to="/account/rides" className="btn-accent inline-block">Мої рейси</Link>
          </section>
        )}

        {data?.vehicles && data.vehicles.length > 0 && (
          <section className="card space-y-2 p-5">
            <h2 className="font-medium text-sm">Ваш транспорт</h2>
            <ul className="space-y-1 text-sm">
              {data.vehicles.map((v) => (
                <li key={v.id}>{v.brand} {v.model} · {v.seats} місць</li>
              ))}
            </ul>
          </section>
        )}
    </div>
  )
}
