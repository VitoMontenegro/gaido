import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, catalogApi } from '../api/client'

type Props = {
  value?: number
  onChange: (cityId: number) => void
  required?: boolean
}

export default function CityPicker({ value = 0, onChange, required }: Props) {
  const qc = useQueryClient()
  const [countrySlug, setCountrySlug] = useState('')
  const [customName, setCustomName] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [duplicateHint, setDuplicateHint] = useState('')

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

  const createCity = useMutation({
    mutationFn: (body: { country_slug: string; name: string }) =>
      api<{ id: number; name: string; created?: boolean }>('/api/v1/account/guide/geo/cities', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cities', countrySlug] })
      onChange(data.id)
      setCustomName('')
      setShowCustom(false)
      if (data.created === false) {
        setDuplicateHint(`Місто «${data.name}» уже є в каталозі — обрано.`)
      } else {
        setDuplicateHint('')
      }
    },
  })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="input w-full"
          value={countrySlug}
          onChange={(e) => {
            setCountrySlug(e.target.value)
            onChange(0)
            setShowCustom(false)
            setCustomName('')
            setDuplicateHint('')
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
          disabled={!countrySlug || showCustom}
          onChange={(e) => onChange(Number(e.target.value))}
          required={required && !showCustom && value <= 0}
        >
          <option value="" disabled>Місто</option>
          {(cities?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {countrySlug && (
        <div className="space-y-2">
          {!showCustom ? (
            <button
              type="button"
              className="text-sm text-brand-700 hover:underline"
              onClick={() => setShowCustom(true)}
            >
              Немає потрібного міста? Додати своє
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                className="input min-w-0 flex-1"
                placeholder="Назва міста"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value)
                  setDuplicateHint('')
                }}
              />
              <button
                type="button"
                className="btn-secondary shrink-0"
                disabled={!customName.trim() || createCity.isPending}
                onClick={() => createCity.mutate({ country_slug: countrySlug, name: customName.trim() })}
              >
                {createCity.isPending ? '…' : 'Додати'}
              </button>
              <button
                type="button"
                className="text-sm text-stone-500 hover:underline"
                onClick={() => {
                  setShowCustom(false)
                  setCustomName('')
                }}
              >
                Скасувати
              </button>
            </div>
          )}
          {duplicateHint && (
            <p className="text-sm text-amber-800">{duplicateHint}</p>
          )}
          {createCity.isError && (
            <p className="text-sm text-red-600">{(createCity.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  )
}
