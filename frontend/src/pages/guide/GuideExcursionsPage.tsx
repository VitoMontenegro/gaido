import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '../../api/client'
import {
  type ExcursionItem, excursionStatusLabel, excursionTypeLabel, formatPrice, statusTone
} from '../../components/excursionUi'

export function GuideExcursionsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-excursions'],
    queryFn: () => api<{ items: ExcursionItem[]; moderation_enabled: boolean }>('/api/v1/account/guide/excursions'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-excursions'] })

  const submit = useMutation({
    mutationFn: (id: number) => guideApi.submitExcursion(id),
    onSuccess: invalidate,
  })
  const toDraft = useMutation({
    mutationFn: (id: number) => guideApi.draftExcursion(id),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => guideApi.deleteExcursion(id),
    onSuccess: invalidate,
  })
  const actionError = submit.error ?? toDraft.error ?? remove.error

  const items = data?.items ?? []
  const moderationEnabled = data?.moderation_enabled ?? true

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Мої екскурсії</h2>
        <Link to="/account/guide/excursions/new" className="btn-primary">Створити</Link>
      </div>

      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
      {isError && <div className="card text-sm text-red-600">{error?.message ?? 'Помилка завантаження'}</div>}
      {actionError && (
        <div className="card text-sm text-red-600">{actionError.message}</div>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <div className="card text-sm text-stone-500">Екскурсій поки немає. Створіть першу.</div>
      )}

      <div className="grid gap-4">
        {items.map((e) => (
          <article key={e.id} className="card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold">{e.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(e.status)}`}>
                  {excursionStatusLabel(e.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {e.city_name || 'Місто не вказано'} · {excursionTypeLabel(e.type)} · до {e.max_guests} ос.
              </p>
              <p className="mt-2 font-semibold text-teal">{formatPrice(e.price_from, e.currency)}</p>
              {e.slug && (
                <Link to={`/excursion/${e.slug}`} className="mt-2 inline-block text-sm text-teal hover:underline">
                  {e.status === 'PUBLISHED' ? 'Переглянути в каталозі →' : 'Попередній перегляд →'}
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/account/guide/excursions/${e.id}/edit`} className="btn-secondary py-1.5 text-sm">
                Редагувати
              </Link>
              {e.status === 'DRAFT' && (
                <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => submit.mutate(e.id)}>
                  {moderationEnabled ? 'На модерацію' : 'Опублікувати'}
                </button>
              )}
              {(e.status === 'PUBLISHED' || e.status === 'PENDING_MODERATION' || e.status === 'REJECTED') && (
                <button type="button" className="btn-secondary py-1.5 text-sm" disabled={toDraft.isPending} onClick={() => toDraft.mutate(e.id)}>
                  У чернетку
                </button>
              )}
              <button
                type="button"
                className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (window.confirm(`Видалити «${e.title}»?`)) remove.mutate(e.id)
                }}
              >
                Видалити
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
