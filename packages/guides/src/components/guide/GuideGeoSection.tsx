import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import CityPicker from '../CityPicker'
import type { GuideCity, GuideCountry } from '../../pages/guide/shared'

type Props = {
  countries: GuideCountry[]
  cities: GuideCity[]
  onCountriesChange: (countries: GuideCountry[]) => void
  onCitiesChange: (cities: GuideCity[]) => void
}

export default function GuideGeoSection({
  countries,
  cities,
  onCountriesChange,
  onCitiesChange,
}: Props) {
  const { data: allCountries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const [pickerCountryId, setPickerCountryId] = useState(0)
  const [pickerCityIds, setPickerCityIds] = useState<Record<string, number>>({})
  const [addingCity, setAddingCity] = useState<string | null>(null)

  const availableCountries = (allCountries?.items ?? []).filter(
    (c) => !countries.some((gc) => gc.id === c.id),
  )

  const addCountry = () => {
    if (pickerCountryId <= 0) return
    const country = (allCountries?.items ?? []).find((c) => c.id === pickerCountryId)
    if (!country) return
    onCountriesChange([
      ...countries,
      {
        id: country.id,
        slug: country.slug,
        name: country.name,
        is_primary: countries.length === 0,
      },
    ])
    setPickerCountryId(0)
  }

  const removeCountry = (slug: string) => {
    const nextCountries = countries.filter((c) => c.slug !== slug)
    if (nextCountries.length > 0 && !nextCountries.some((c) => c.is_primary)) {
      nextCountries[0] = { ...nextCountries[0], is_primary: true }
    }
    onCountriesChange(nextCountries)
    onCitiesChange(cities.filter((c) => c.country_slug !== slug))
  }

  const setPrimaryCountry = (id: number) => {
    onCountriesChange(countries.map((c) => ({ ...c, is_primary: c.id === id })))
  }

  const countryCities = (slug: string) => cities.filter((c) => c.country_slug === slug)

  const addCity = async (countrySlug: string) => {
    const pickerCityId = pickerCityIds[countrySlug] ?? 0
    if (pickerCityId <= 0 || cities.some((c) => c.id === pickerCityId)) {
      setPickerCityIds((prev) => ({ ...prev, [countrySlug]: 0 }))
      return
    }
    setAddingCity(countrySlug)
    try {
      const city = await catalogApi.cityById(pickerCityId)
      onCitiesChange([
        ...cities,
        {
          id: city.id,
          name: city.name,
          slug: city.slug,
          country_slug: city.country_slug ?? countrySlug,
          is_primary: cities.length === 0,
        },
      ])
      setPickerCityIds((prev) => ({ ...prev, [countrySlug]: 0 }))
    } finally {
      setAddingCity(null)
    }
  }

  const removeCity = (id: number) => {
    const next = cities.filter((c) => c.id !== id)
    if (next.length > 0 && !next.some((c) => c.is_primary)) {
      next[0] = { ...next[0], is_primary: true }
    }
    onCitiesChange(next)
  }

  const setPrimaryCity = (id: number) => {
    onCitiesChange(cities.map((c) => ({ ...c, is_primary: c.id === id })))
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-sand-50/80 p-4">
      <p className="font-medium">Географія роботи</p>
      <p className="text-base text-stone-500">
        Оберіть країни та міста, де ви працюєте. Вас покажуть у каталозі в кожній обраній країні.
      </p>

      {countries.length > 0 && (
        <div className="space-y-4">
          {countries.map((country) => {
            const localCities = countryCities(country.slug)
            return (
              <div
                key={country.id}
                className="space-y-2 rounded-lg border border-border bg-white p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 font-medium">{country.name}</span>
                  {country.is_primary ? (
                    <span className="text-xs text-brand-700">Основна</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-stone-500 hover:underline"
                      onClick={() => setPrimaryCountry(country.id)}
                    >
                      Зробити основною
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => removeCountry(country.slug)}
                  >
                    Видалити країну
                  </button>
                </div>

                {localCities.length > 0 && (
                  <ul className="space-y-1">
                    {localCities.map((city) => (
                      <li
                        key={city.id}
                        className="flex flex-wrap items-center gap-2 rounded-md bg-sand-50 px-2 py-1.5"
                      >
                        <span className="min-w-0 flex-1 text-sm">{city.name}</span>
                        {city.is_primary ? (
                          <span className="text-xs text-brand-700">Основне місто</span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-stone-500 hover:underline"
                            onClick={() => setPrimaryCity(city.id)}
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

                <div className="space-y-2">
                  <CityPicker
                    value={pickerCityIds[country.slug] ?? 0}
                    onChange={(id) =>
                      setPickerCityIds((prev) => ({ ...prev, [country.slug]: id }))
                    }
                    defaultCountrySlug={country.slug}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={(pickerCityIds[country.slug] ?? 0) <= 0 || addingCity === country.slug}
                    onClick={() => void addCity(country.slug)}
                  >
                    {addingCity === country.slug ? '…' : 'Додати місто'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1">
          <span className="text-sm text-stone-600">Додати країну</span>
          <select
            className="input w-full"
            value={pickerCountryId || ''}
            onChange={(e) => setPickerCountryId(e.target.value ? Number(e.target.value) : 0)}
          >
            <option value="">Оберіть країну</option>
            {availableCountries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={pickerCountryId <= 0}
          onClick={addCountry}
        >
          Додати
        </button>
      </div>
    </div>
  )
}
