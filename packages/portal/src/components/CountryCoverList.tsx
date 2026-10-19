import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@gaido/api-client/api/client'
import { ImageUrlField } from './ImageUrlField'

type CountryRow = { id: number; slug: string; name: string; cover_image_url: string }

function CountryCoverRow({
  country,
  saved,
  onSave,
}: {
  country: CountryRow
  saved: boolean
  onSave: (cover: string) => void
}) {
  const [cover, setCover] = useState(country.cover_image_url)
  useEffect(() => {
    setCover(country.cover_image_url)
  }, [country.cover_image_url])

  return (
    <li className="rounded-2xl border border-divider p-4">
      <p className="mb-3 font-medium">
        {country.name} <span className="text-sm font-normal text-muted">{country.slug}</span>
      </p>
      <ImageUrlField
        label="Фото країни"
        value={cover}
        cropAspect={4 / 3}
        onChange={setCover}
        onPersist={onSave}
      />
      {cover.trim() !== country.cover_image_url && (
        <button type="button" className="btn-secondary mt-3 py-2 text-sm" onClick={() => onSave(cover.trim())}>
          Зберегти посилання
        </button>
      )}
      {saved && <p className="mt-2 text-xs text-teal">Збережено</p>}
    </li>
  )
}

export default function CountryCoverList() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [savedId, setSavedId] = useState<number | null>(null)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['mod-geo-countries'],
    queryFn: () => adminApi.geoCountries(),
  })
  const save = useMutation({
    mutationFn: ({ id, cover }: { id: number; cover: string }) => adminApi.updateCountryCover(id, cover),
    onSuccess: (_data, variables) => {
      setSavedId(variables.id)
      void qc.invalidateQueries({ queryKey: ['mod-geo-countries'] })
      void qc.invalidateQueries({ queryKey: ['country-catalog'] })
    },
  })

  const items = useMemo(() => {
    const list = data?.items ?? []
    const q = query.trim().toLocaleLowerCase('uk')
    if (!q) return list
    return list.filter((country) =>
      country.name.toLocaleLowerCase('uk').includes(q) || country.slug.toLocaleLowerCase('uk').includes(q),
    )
  }, [data?.items, query])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-medium">Країни в базі</h2>
          <p className="text-sm text-muted">Фото країни показується в популярних напрямках і містах, якщо в міста немає своєї обкладинки.</p>
        </div>
        <p className="text-sm text-muted">{data?.items.length ?? 0}</p>
      </div>
      <input
        className="input"
        value={query}
        placeholder="Пошук країни"
        onChange={(event) => setQuery(event.target.value)}
      />
      {isLoading && <p className="text-sm text-muted">Завантаження…</p>}
      {isError && <p className="text-sm text-red-700">Не вдалося завантажити країни.</p>}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-muted">Нічого не знайдено.</p>
      )}
      <ul className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {items.map((country) => (
          <CountryCoverRow
            key={country.id}
            country={country}
            saved={savedId === country.id && !save.isPending}
            onSave={(cover) => save.mutate({ id: country.id, cover })}
          />
        ))}
      </ul>
    </section>
  )
}
