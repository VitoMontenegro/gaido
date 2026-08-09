import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '../../api/client'
import GuideAvatar from '../../components/GuideAvatar'
import { ImageUrlField } from '../../components/ImageUrlField'
import type { GuideProfile } from './shared'
import { CatalogStatusBanner } from './shared'

export function GuideProfilePage() {
  return <GuideProfileForm />
}

function GuideProfileForm() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const [form, setForm] = useState<Partial<GuideProfile>>({})
  const mutation = useMutation({
    mutationFn: (body: Partial<GuideProfile>) =>
      guideApi.updateProfile({ ...data, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guide-profile'] }),
  })

  const f = { ...data, ...form }
  const isCompanion = f.guide_type === 'COMPANION'

  return (
    <div className="card space-y-3">
      <h2 className="font-display text-xl font-bold">Профіль</h2>
      <p className="text-sm text-stone-500">Статус профілю: {f.status}</p>
      <CatalogStatusBanner profile={f} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isCompanion}
          onChange={(e) => setForm({ guide_type: e.target.checked ? 'COMPANION' : 'GUIDE' })}
        />
        Я компаньйон (ліцензія не потрібна)
      </label>
      {!isCompanion && (
        <p className="text-xs text-stone-500">
          Тип «Гід» або «Конферансьє» визначається завантаженою ліцензією в розділі{' '}
          <Link to="/account/guide/documents" className="text-brand-700 hover:underline">Документи</Link>.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <GuideAvatar avatar={f.avatar_url} name={f.display_name} className="h-24 w-24 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <ImageUrlField
            label="Фото профілю"
            value={f.avatar_url ?? ''}
            cropAspect={1}
            outputFormat="webp"
            maxBytes={150 * 1024}
            onChange={(avatar_url) => setForm({ avatar_url })}
          />
        </div>
      </div>
      <input className="input" placeholder="Ім&apos;я для відображення" defaultValue={f.display_name} onChange={(e) => setForm({ display_name: e.target.value })} />
      <textarea className="input min-h-24" placeholder="Про себе" defaultValue={f.about} onChange={(e) => setForm({ about: e.target.value })} />
      <input className="input" placeholder="Телефон" defaultValue={f.phone} onChange={(e) => setForm({ phone: e.target.value })} />
      <input className="input" placeholder="Telegram" defaultValue={f.telegram} onChange={(e) => setForm({ telegram: e.target.value })} />
      <button type="button" className="btn-primary" onClick={() => mutation.mutate(form)}>Зберегти</button>
    </div>
  )
}
