import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { discoverApi, providerApi } from '@gaido/api-client/api/discover'
import GeoCityPicker from '@gaido/ui-primitives/GeoCityPicker'
import LeafletMap from '../map/LeafletMap'

type Pin = { lat: number; lng: number }

export default function PointLocationForm({ onSaved }: { onSaved: () => void }) {
  const [cityId, setCityId] = useState(0)
  const [address, setAddress] = useState('')
  const [pin, setPin] = useState<Pin | null>(null)
  const [hint, setHint] = useState('')

  const { data: city } = useQuery({
    queryKey: ['city-by-id', cityId],
    queryFn: () => catalogApi.cityById(cityId),
    enabled: cityId > 0,
  })

  const lookup = useMutation({
    mutationFn: () => {
      const q = city?.name ? `${address.trim()}, ${city.name}` : address.trim()
      return discoverApi.searchAddress(q, city?.country_slug)
    },
    onSuccess: (res) => {
      setPin({ lat: res.lat, lng: res.lng })
      if (res.address) setAddress(res.address)
      setHint('')
    },
    onError: () => setHint('Адресу не знайдено. Поставте точку кліком на карті.'),
  })

  const save = useMutation({
    mutationFn: () => {
      if (!pin) throw new Error('Поставте точку на карті')
      const label = address.trim() || city?.name || 'Точка'
      return providerApi.upsertPoint({
        label,
        address_text: address.trim(),
        district: city?.name ?? '',
        city_id: city?.id,
        latitude: pin.lat,
        longitude: pin.lng,
        address_visibility: address.trim() ? 'exact' : 'district',
      })
    },
    onSuccess: () => {
      setAddress('')
      setPin(null)
      setHint('')
      onSaved()
    },
  })

  const center = pin ?? (city && city.latitude && city.longitude ? { lat: city.latitude, lng: city.longitude } : null)

  const placePin = async (lat: number, lng: number) => {
    setPin({ lat, lng })
    try {
      const res = await discoverApi.reverseAddress(lat, lng)
      if (res.address) setAddress(res.address)
      if (cityId <= 0 && res.city_id) setCityId(res.city_id)
      setHint('')
    } catch {
      setHint('Координати збережено, адресу визначити не вдалося.')
    }
  }

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <h2 className="font-medium">Додати точку</h2>
      <div className="space-y-1">
        <p className="text-sm font-medium">Країна та місто</p>
        <GeoCityPicker
          value={cityId}
          required
          onChange={(id) => {
            setCityId(id)
            setPin(null)
          }}
        />
      </div>
      <label className="block space-y-1 text-sm">
        <span>Адреса</span>
        <div className="flex flex-wrap gap-2">
          <input
            className="input min-w-0 flex-1"
            placeholder="Вулиця, будинок"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={lookup.isPending || !address.trim()}
            onClick={() => lookup.mutate()}
          >
            {lookup.isPending ? '…' : 'Знайти'}
          </button>
        </div>
      </label>
      <LeafletMap
        compact
        points={pin ? [pin] : []}
        center={center}
        fitOptions={{ singleZoom: pin ? 16 : 12, maxZoom: 18 }}
        onMapClick={placePin}
      />
      {(hint || save.isError) && (
        <p className="text-sm text-red-600">
          {hint || (save.error instanceof Error ? save.error.message : 'Не вдалося зберегти')}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={save.isPending || !pin || !city}>
        {save.isPending ? 'Збереження…' : 'Зберегти точку'}
      </button>
    </form>
  )
}
