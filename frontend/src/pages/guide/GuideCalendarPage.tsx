import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

type Slot = { id: number; starts_at: string; ends_at: string; note: string }

export function GuideCalendarPage() {
  const qc = useQueryClient()
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api<{ items: Slot[] }>('/api/v1/account/guide/calendar'),
  })

  const create = useMutation({
    mutationFn: () =>
      api<{ id: number }>('/api/v1/account/guide/calendar', {
        method: 'POST',
        body: JSON.stringify({
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          note,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] })
      setStartsAt('')
      setEndsAt('')
      setNote('')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) =>
      api(`/api/v1/account/guide/calendar/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-display mb-1 text-xl font-bold">Календар доступності</h2>
        <p className="text-sm text-stone-500">Інформаційні слоти — без бронювання.</p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!startsAt || !endsAt) return
          create.mutate()
        }}
      >
        <label className="text-sm">
          Початок
          <input
            type="datetime-local"
            className="input mt-1 w-full"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Кінець
          <input
            type="datetime-local"
            className="input mt-1 w-full"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Нотатка
          <input
            className="input mt-1 w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Опційно"
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Додаємо…' : 'Додати слот'}
          </button>
          {create.isError && (
            <p className="mt-2 text-sm text-red-600">{(create.error as Error).message}</p>
          )}
        </div>
      </form>

      {isLoading && <p className="text-sm text-muted">Завантаження…</p>}
      <ul className="space-y-2">
        {(data?.items ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2 text-sm">
            <span>
              {new Date(s.starts_at).toLocaleString('uk-UA')} — {new Date(s.ends_at).toLocaleString('uk-UA')}
              {s.note ? ` · ${s.note}` : ''}
            </span>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              disabled={remove.isPending}
              onClick={() => remove.mutate(s.id)}
            >
              Видалити
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
