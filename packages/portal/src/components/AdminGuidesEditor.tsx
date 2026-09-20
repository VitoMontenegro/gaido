import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminGuide, type AdminListParams } from '@gaido/api-client/api/client'
import GuideAvatar from './GuideAvatar'
import { ImageUrlField } from './ImageUrlField'

const PAGE_SIZE = 50

export function AdminGuidesEditor() {
  const qc = useQueryClient()
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [bypassId, setBypassId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300)
    return () => clearTimeout(t)
  }, [qInput])

  useEffect(() => {
    setOffset(0)
  }, [q])

  const params: AdminListParams = {
    ...(q.trim() ? { q: q.trim() } : {}),
    limit: PAGE_SIZE,
    offset,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-guides', params],
    queryFn: () => adminApi.guides(params),
    placeholderData: keepPreviousData,
  })
  const { data: plans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.plans(),
  })
  const placementPlanId = (plans?.items ?? []).find((p) => p.plan_type === 'GUIDE_PLACEMENT')?.id
    ?? plans?.items?.[0]?.id

  const items = data?.items ?? []
  const total = data?.total ?? items.length

  const save = async (guide: AdminGuide) => {
    const avatar_url = drafts[guide.id] ?? guide.avatar_url ?? ''
    setSavingId(guide.id)
    setMessage('')
    try {
      const updated = await adminApi.updateGuide(guide.id, { avatar_url })
      qc.invalidateQueries({ queryKey: ['admin-guides'] })
      qc.invalidateQueries({ queryKey: ['guides'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      setDrafts((prev) => ({ ...prev, [guide.id]: updated.avatar_url ?? '' }))
      setMessage(`Збережено: ${guide.display_name}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSavingId(null)
    }
  }

  const activate = async (guide: AdminGuide) => {
    if (!placementPlanId) {
      setMessage('Немає тарифного плану для активації')
      return
    }
    setBypassId(guide.id)
    setMessage('')
    try {
      await adminApi.approveGuide(guide.id, placementPlanId)
      qc.invalidateQueries({ queryKey: ['admin-guides'] })
      qc.invalidateQueries({ queryKey: ['guides'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      setMessage(`Схвалено: ${guide.display_name}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка активації')
    } finally {
      setBypassId(null)
    }
  }

  if (isLoading && !data) {
    return <div className="card text-muted">Завантаження гідів…</div>
  }
  if (isError) {
    return <div className="card text-muted">Не вдалося завантажити гідів</div>
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Фото гідів</h2>
        <p className="mt-1 text-sm text-muted">
          Завантажте або вкажіть URL аватара для кожного гіда. Без фото показується заглушка.
        </p>
      </div>

      <input
        className="input max-w-xs py-2"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        placeholder="Пошук за імʼям"
      />

      {message && <p className="text-sm text-muted">{message}</p>}

      <ul className="space-y-4">
        {items.map((guide) => (
          <li key={guide.id} className="rounded-2xl border border-divider p-4">
            <div className="flex flex-wrap items-start gap-4">
              <GuideAvatar avatar={drafts[guide.id] ?? guide.avatar_url} name={guide.display_name} className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-display font-medium uppercase text-ink">{guide.display_name}</p>
                  <p className="text-sm text-muted-light">/{guide.slug} · {guide.status}</p>
                </div>
                <ImageUrlField
                  label="Фото профілю"
                  value={drafts[guide.id] ?? guide.avatar_url ?? ''}
                  cropAspect={1}
                  outputFormat="webp"
                  maxBytes={150 * 1024}
                  onChange={(avatar_url) => setDrafts((prev) => ({ ...prev, [guide.id]: avatar_url }))}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={savingId === guide.id}
                    onClick={() => save(guide)}
                  >
                    {savingId === guide.id ? 'Збереження…' : 'Зберегти фото'}
                  </button>
                  {guide.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      className="btn-accent"
                      disabled={bypassId === guide.id || !placementPlanId}
                      onClick={() => activate(guide)}
                    >
                      {bypassId === guide.id ? 'Активація…' : 'Схвалити'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">{Math.min(offset + 1, total)}–{Math.min(offset + PAGE_SIZE, total)} з {total}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Назад</button>
            <button type="button" className="btn-secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Далі</button>
          </div>
        </div>
      )}
    </div>
  )
}
