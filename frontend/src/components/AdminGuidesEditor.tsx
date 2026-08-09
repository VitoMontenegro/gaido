import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import GuideAvatar from './GuideAvatar'
import { ImageUrlField } from './ImageUrlField'

type AdminGuide = {
  id: number
  display_name: string
  slug: string
  status: string
  avatar_url: string
}

export function AdminGuidesEditor() {
  const qc = useQueryClient()
  const [items, setItems] = useState<AdminGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [bypassId, setBypassId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.settings(),
  })
  const { data: plans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.plans(),
  })
  const placementPlanId = (plans?.items ?? []).find((p) => p.plan_type === 'GUIDE_PLACEMENT')?.id
    ?? plans?.items?.[0]?.id

  useEffect(() => {
    adminApi.guides()
      .then((res) => {
        setItems(res.items)
        setDrafts(Object.fromEntries(res.items.map((g) => [g.id, g.avatar_url ?? ''])))
      })
      .catch(() => setMessage('Не вдалося завантажити гідів'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (guide: AdminGuide) => {
    const avatar_url = drafts[guide.id] ?? ''
    setSavingId(guide.id)
    setMessage('')
    try {
      const updated = await adminApi.updateGuide(guide.id, { avatar_url })
      setItems((prev) => prev.map((g) => (g.id === guide.id ? updated : g)))
      qc.invalidateQueries({ queryKey: ['guides'] })
      qc.invalidateQueries({ queryKey: ['site'] })
      setMessage(`Збережено: ${guide.display_name}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSavingId(null)
    }
  }

  const bypass = async (guide: AdminGuide) => {
    if (!placementPlanId) {
      setMessage('Немає тарифного плану для активації')
      return
    }
    setBypassId(guide.id)
    setMessage('')
    try {
      await adminApi.bypassGuide(guide.id, placementPlanId)
      setItems((prev) => prev.map((g) => (g.id === guide.id ? { ...g, status: 'ACTIVE' } : g)))
      qc.invalidateQueries({ queryKey: ['guides'] })
      setMessage(`Активовано bypass: ${guide.display_name}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка bypass')
    } finally {
      setBypassId(null)
    }
  }

  if (loading) {
    return <div className="card text-muted">Завантаження гідів…</div>
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Фото гідів</h2>
        <p className="mt-1 text-sm text-muted">
          Завантажте або вкажіть URL аватара для кожного гіда. Без фото показується заглушка.
        </p>
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}

      <ul className="space-y-4">
        {items.map((guide) => (
          <li key={guide.id} className="rounded-2xl border border-divider p-4">
            <div className="flex flex-wrap items-start gap-4">
              <GuideAvatar avatar={drafts[guide.id]} name={guide.display_name} className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-display font-medium uppercase text-ink">{guide.display_name}</p>
                  <p className="text-sm text-muted-light">/{guide.slug} · {guide.status}</p>
                </div>
                <ImageUrlField
                  label="Фото профілю"
                  value={drafts[guide.id] ?? ''}
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
                  {!settings?.guide_placement_payments_enabled && guide.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={bypassId === guide.id || !placementPlanId}
                      onClick={() => bypass(guide)}
                    >
                      {bypassId === guide.id ? 'Активація…' : 'Bypass активація'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
