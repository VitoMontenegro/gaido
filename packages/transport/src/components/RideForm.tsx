import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { transportApi } from '@gaido/api-client/api/transport'
import { providerApi } from '@gaido/api-client/api/discover'
import { resolveMediaUrl } from '@gaido/api-client/api/http'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import type { TransportDeparture, TransportListing, TransportListingInput } from '@gaido/api-client/api/types/transport'
import CitySelect from './CitySelect'

type Props = {
  initial?: TransportListing
  onSaved: () => void
  onCancel?: () => void
}

const emptyDeparture = (): TransportDeparture => ({ depart_on: '', arrive_on: '' })

export default function RideForm({ initial, onSaved, onCancel }: Props) {
  const { data: me } = useMe()
  const [kind, setKind] = useState<'regular' | 'occasional'>(initial?.kind ?? 'regular')
  const [companyName, setCompanyName] = useState(initial?.company_name ?? '')
  const [driverNames, setDriverNames] = useState(initial?.driver_names ?? '')
  const [vehicleBrand, setVehicleBrand] = useState(initial?.vehicle_brand ?? '')
  const [vehiclePhoto, setVehiclePhoto] = useState(initial?.vehicle_photo_url ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [telegram, setTelegram] = useState(initial?.telegram ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [viber, setViber] = useState(initial?.viber ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [price, setPrice] = useState(String(initial?.price_amount ?? ''))
  const [currency, setCurrency] = useState(initial?.price_currency ?? 'EUR')
  const [seats, setSeats] = useState(String(initial?.seats_total ?? '4'))
  const [parcels, setParcels] = useState(initial?.parcels_accepted ?? false)
  const [parcelsTerms, setParcelsTerms] = useState(initial?.parcels_terms ?? '')
  const [departTime, setDepartTime] = useState(initial?.depart_time ?? '08:00')
  const [arriveTime, setArriveTime] = useState(initial?.arrive_time_approx ?? '')
  const [stopCityIds, setStopCityIds] = useState<number[]>(
    initial?.stops?.length ? initial.stops.sort((a, b) => a.sort_order - b.sort_order).map((s) => s.city_id) : [0, 0],
  )
  const [departures, setDepartures] = useState<TransportDeparture[]>(
    initial?.departures?.length ? initial.departures : [emptyDeparture()],
  )
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const saveMut = useMutation({
    mutationFn: async (body: TransportListingInput) => {
      if (initial) {
        await transportApi.update(initial.id, body)
      } else {
        await transportApi.create(body)
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: Error) => setError(e.message),
  })

  const addStop = () => setStopCityIds((s) => [...s, 0])
  const removeStop = (idx: number) => setStopCityIds((s) => s.filter((_, i) => i !== idx))

  const handlePhoto = async (file: File) => {
    setUploading(true)
    try {
      if (me) {
        const acc = await providerApi.account()
        if (!acc.profile) {
          const name = driverNames.trim() || `${me.first_name} ${me.last_name}`.trim() || me.login
          await providerApi.register(name, me.login.toLowerCase())
        }
      }
      const res = await transportApi.uploadPhoto(file)
      setVehiclePhoto(res.public_key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setUploading(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const stops = stopCityIds.filter(Boolean).map((city_id, i) => ({ city_id, sort_order: i + 1 }))
    const body: TransportListingInput = {
      kind,
      company_name: companyName,
      driver_names: driverNames,
      vehicle_brand: vehicleBrand,
      vehicle_photo_url: vehiclePhoto,
      phone,
      telegram,
      whatsapp,
      viber,
      email,
      price_amount: Number(price) || 0,
      price_currency: currency,
      seats_total: Number(seats) || 1,
      parcels_accepted: parcels,
      parcels_terms: parcelsTerms,
      depart_time: departTime,
      arrive_time_approx: arriveTime,
      status: 'published',
      stops,
      departures: departures.filter((d) => d.depart_on),
    }
    saveMut.mutate(body)
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Тип</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'regular' | 'occasional')}>
            <option value="regular">Регулярний перевізник</option>
            <option value="occasional">Разова попутка</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Назва компанії (необовʼязково)</span>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Імена водіїв *</span>
          <input className="input" required value={driverNames} onChange={(e) => setDriverNames(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Марка авто *</span>
          <input className="input" required value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Фото авто</span>
        {vehiclePhoto && (
          <img src={resolveMediaUrl(vehiclePhoto)} alt="" className="h-32 rounded-lg object-cover" />
        )}
        <input type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input className="input" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="input" placeholder="Telegram" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
        <input className="input" placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <input className="input" placeholder="Viber" value={viber} onChange={(e) => setViber(e.target.value)} />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Маршрут (міста по порядку) *</h3>
          <button type="button" className="btn-ghost text-sm" onClick={addStop}>+ місто</button>
        </div>
        {stopCityIds.map((cityId, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="flex-1">
              <CitySelect
                label={`Зупинка ${idx + 1}`}
                value={cityId || undefined}
                onChange={(id) => setStopCityIds((s) => s.map((v, i) => (i === idx ? id : v)))}
              />
            </div>
            {stopCityIds.length > 2 && (
              <button type="button" className="btn-ghost px-2" onClick={() => removeStop(idx)} aria-label="Видалити">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Час відправлення</span>
          <input className="input" type="time" value={departTime} onChange={(e) => setDepartTime(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Орієнтовний час прибуття</span>
          <input className="input" type="time" value={arriveTime} onChange={(e) => setArriveTime(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Місць</span>
          <input className="input" type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Ціна</span>
          <input className="input" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Валюта</span>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="EUR">EUR</option>
            <option value="PLN">PLN</option>
            <option value="UAH">UAH</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={parcels} onChange={(e) => setParcels(e.target.checked)} />
        Беремо посилки
      </label>
      {parcels && (
        <textarea
          className="input min-h-20"
          placeholder="Умови для посилок"
          value={parcelsTerms}
          onChange={(e) => setParcelsTerms(e.target.value)}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Дати виїзду</h3>
          <button type="button" className="btn-ghost text-sm" onClick={() => setDepartures((d) => [...d, emptyDeparture()])}>
            + дата
          </button>
        </div>
        {departures.map((d, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-2">
            <input
              className="input"
              type="date"
              value={d.depart_on}
              onChange={(e) =>
                setDepartures((deps) => deps.map((x, i) => (i === idx ? { ...x, depart_on: e.target.value } : x)))
              }
            />
            <input
              className="input"
              type="date"
              placeholder="Прибуття"
              value={d.arrive_on ?? ''}
              onChange={(e) =>
                setDepartures((deps) => deps.map((x, i) => (i === idx ? { ...x, arrive_on: e.target.value } : x)))
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-accent" disabled={saveMut.isPending || uploading}>
          {initial ? 'Зберегти' : 'Опублікувати рейс'}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Скасувати
          </button>
        )}
      </div>
    </form>
  )
}
