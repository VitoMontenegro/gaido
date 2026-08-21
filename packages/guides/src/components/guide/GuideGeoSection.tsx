import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import CityPicker from '../CityPicker'
import type { GuideCity } from '../../pages/guide/shared'

type Props = {
  countryId?: number | null
  countrySlug?: string
  cities: GuideCity[]
  onCountryChange: (countryId: number | null, countrySlug: string) => void
  onCitiesChange: (cities: GuideCity[]) => void
}

export default function GuideGeoSection({
  countryId,
  countrySlug = '',
  cities,
  onCountryChange,
  onCitiesChange,
}: Props) {
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const [pickerCityId, setPickerCityId] = useState(0)
  const [adding, setAdding] = useState(false)

  const selectedSlug =
    countrySlug ||
    (countryId ? (countries?.items ?? []).find((c) => c.id === countryId)?.slug : '') ||
    ''

  const addCity = async () => {
    if (pickerCityId <= 0 || cities.some((c) => c.id === pickerCityId)) {
      setPickerCityId(0)
      return
    }
    setAdding(true)
    try {
      const city = await catalogApi.cityById(pickerCityId)
      onCitiesChange([
        ...cities,
        {
          id: city.id,
          name: city.name,
          slug: city.slug,
          country_slug: city.country_slug ?? selectedSlug,
          is_primary: cities.length === 0,
        },
      ])
      setPickerCityId(0)
    } finally {
      setAdding(false)
    }
  }

  const removeCity = (id: number) => {
    const next = cities.filter((c) => c.id !== id)
    if (next.length > 0 && !next.some((c) => c.is_primary)) {
      next[0] = { ...next[0], is_primary: true }
    }
    onCitiesChange(next)
  }

  const setPrimary = (id: number) => {
    onCitiesChange(cities.map((c) => ({ ...c, is_primary: c.id === id })))
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-sand-50/80 p-4">
      <p className="font-medium">Географія роботи</p>
      <p className="text-base text-stone-500">
        Якщо у вас ще немає екскурсій, ці дані покажуть вас у каталозі за країною та містами.
      </p>

      <label className="block space-y-1">
        <span className="text-sm text-stone-600">Країна</span>
        <select
          className="input w-full"
          value={countryId ?? ''}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null
            const country = (countries?.items ?? []).find((c) => c.id === id)
            onCountryChange(id, country?.slug ?? '')
          }}
        >
          <option value="">Оберіть країну</option>
          {(countries?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {cities.length > 0 && (
        <ul className="space-y-2">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm">{city.name}</span>
              {city.is_primary ? (
                <span className="text-xs text-brand-700">Основне</span>
              ) : (
                <button
                  type="button"
                  className="text-xs text-stone-500 hover:underline"
                  onClick={() => setPrimary(city.id)}
                >
                  Зробити основним
                </button>
              )}
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeCity(city.id)}
              >
                Видалити
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedSlug && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">Додати місто</p>
          <CityPicker
            value={pickerCityId}
            onChange={setPickerCityId}
            defaultCountrySlug={selectedSlug}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={pickerCityId <= 0 || adding}
            onClick={() => void addCity()}
          >
            {adding ? '…' : 'Додати місто'}
          </button>
        </div>
      )}

      {!selectedSlug && (
        <p className="text-sm text-stone-500">Спочатку оберіть країну, щоб додати міста.</p>
      )}
    </div>
  )
}
