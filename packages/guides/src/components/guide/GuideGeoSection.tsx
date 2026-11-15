import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import CityPicker from '../CityPicker'
import type { GuideCity, GuideCountry } from '../../pages/guide/shared'

type Props = {
  countries: GuideCountry[]
  cities: GuideCity[]
  onCountriesChange: (countries: GuideCountry[]) => void
  onCitiesChange: (cities: GuideCity[]) => void
  onPendingChange: (pending: boolean) => void
  disabled?: boolean
  saveStatus: ReactNode
}

export default function GuideGeoSection({
  countries,
  cities,
  onCountriesChange,
  onCitiesChange,
  onPendingChange,
  disabled,
  saveStatus,
}: Props) {
  const { data: allCountries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const [pickerCountrySlug, setPickerCountrySlug] = useState('')
  const [pickerKey, setPickerKey] = useState(0)
  const [addingCity, setAddingCity] = useState(false)
  const [creatingCity, setCreatingCity] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    onPendingChange(addingCity || creatingCity)
  }, [addingCity, creatingCity, onPendingChange])

  const selectCountry = (slug: string) => {
    setPickerCountrySlug(slug)
    setError('')
    const country = allCountries?.items.find((c) => c.slug === slug)
    if (!country || countries.some((c) => c.id === country.id)) return
    onCountriesChange([...countries, {
      id: country.id,
      slug: country.slug,
      name: country.name,
      is_primary: countries.length === 0,
    }])
  }

  const removeCountry = (slug: string) => {
    const nextCountries = countries.filter((c) => c.slug !== slug)
    if (nextCountries.length > 0 && !nextCountries.some((c) => c.is_primary)) {
      nextCountries[0] = { ...nextCountries[0], is_primary: true }
    }
    onCountriesChange(nextCountries)
    const nextCities = cities.filter((c) => c.country_slug !== slug)
    if (nextCities.length && !nextCities.some((c) => c.is_primary)) {
      nextCities[0] = { ...nextCities[0], is_primary: true }
    }
    onCitiesChange(nextCities)
    if (pickerCountrySlug === slug) {
      setPickerCountrySlug('')
      setPickerKey((key) => key + 1)
    }
  }

  const setPrimaryCountry = (id: number) => {
    onCountriesChange(countries.map((c) => ({ ...c, is_primary: c.id === id })))
  }

  const countryCities = (slug: string) => cities.filter((c) => c.country_slug === slug)

  const selectCity = async (id: number) => {
    if (id <= 0 || cities.some((c) => c.id === id)) return
    setAddingCity(true)
    setError('')
    try {
      const city = await catalogApi.cityById(id)
      onCitiesChange([...cities, {
        id: city.id,
        name: city.name,
        slug: city.slug,
        country_slug: city.country_slug ?? pickerCountrySlug,
        is_primary: cities.length === 0,
      }])
    } catch {
      setError('Не вдалося обрати місто. Спробуйте ще раз.')
    } finally {
      setAddingCity(false)
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

      <fieldset disabled={disabled || addingCity || creatingCity} className="min-w-0 space-y-3">
        <CityPicker
          key={pickerKey}
          value={0}
          onChange={(id) => void selectCity(id)}
          defaultCountrySlug={pickerCountrySlug}
          onCountryChange={selectCountry}
          onPendingChange={setCreatingCity}
        />
        <p className="text-sm text-stone-500">
          Країна та місто одразу потрапляють до списку нижче. Можна обрати кілька міст і країн.
        </p>
        {addingCity && <p role="status" className="text-sm text-stone-500">Обираємо місто…</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
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

                  {localCities.length === 0 && <p className="text-sm text-amber-800">Оберіть місто для цієї країни.</p>}
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

                </div>
              )
            })}
          </div>
        )}

      </fieldset>
      <div className="border-t border-border pt-3">{saveStatus}</div>
    </div>
  )
}
