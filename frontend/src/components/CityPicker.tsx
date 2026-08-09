import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/client'

type Props = {
  value?: number
  onChange: (cityId: number) => void
  required?: boolean
}

export default function CityPicker({ value = 0, onChange, required }: Props) {
  const [countrySlug, setCountrySlug] = useState('')

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })

  const { data: selectedCity } = useQuery({
    queryKey: ['city-by-id', value],
    queryFn: () => catalogApi.cityById(value),
    enabled: value > 0,
  })

  const { data: cities } = useQuery({
    queryKey: ['cities', countrySlug],
    queryFn: () => catalogApi.citiesByCountry(countrySlug),
    enabled: !!countrySlug,
  })

  useEffect(() => {
    if (value > 0 && selectedCity?.country_slug) {
      setCountrySlug(selectedCity.country_slug)
    }
  }, [value, selectedCity?.country_slug, selectedCity?.id])

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="input w-full"
          value={countrySlug}
          onChange={(e) => {
            setCountrySlug(e.target.value)
            onChange(0)
          }}
          required={required && value <= 0}
        >
          <option value="">Країна</option>
          {(countries?.items ?? []).map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <select
          className="input w-full"
          value={value > 0 ? value : ''}
          disabled={!countrySlug}
          onChange={(e) => onChange(Number(e.target.value))}
          required={required && value <= 0}
        >
          <option value="" disabled>Місто</option>
          {(cities?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {countrySlug && (
        <p className="text-xs text-muted">
          Немає потрібного міста — зверніться до модератора, щоб додати його в каталог.
        </p>
      )}
    </div>
  )
}
