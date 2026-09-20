import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import type { City } from '@gaido/api-client/api/types/catalog'

type Props = {
  label: string
  value?: number
  onChange: (cityId: number, city?: City) => void
  placeholder?: string
}

export default function CityPicker({ label, value, onChange, placeholder = 'Оберіть місто' }: Props) {
  const [query, setQuery] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['all-cities'],
    queryFn: () => catalogApi.cities(),
    staleTime: 300_000,
  })

  const items = data?.items ?? []
  const selected = items.find((c) => c.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? items.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q))
      : items
    const sliced = list.slice(0, 80)
    if (selected && !sliced.some((c) => c.id === selected.id)) return [selected, ...sliced]
    return sliced
  }, [items, query, selected])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink">{label}</label>
      <input
        className="input"
        placeholder="Пошук міста…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="input"
        value={value ?? ''}
        onChange={(e) => {
          const id = Number(e.target.value)
          const city = items.find((c) => c.id === id)
          onChange(id, city)
        }}
      >
        <option value="">{selected ? selected.name : placeholder}</option>
        {isLoading && <option disabled>Завантаження…</option>}
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
