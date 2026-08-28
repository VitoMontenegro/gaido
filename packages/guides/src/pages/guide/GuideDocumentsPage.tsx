import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '@gaido/api-client/api/client'
import type { GuideDocument, GuideProfile } from './shared'
import { CatalogStatusBanner, formatSize, guideProfilePayload } from './shared'

export function GuideDocumentsPage() {
  const qc = useQueryClient()
  const { data: profile } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const { data: docs } = useQuery({
    queryKey: ['guide-documents'],
    queryFn: () => api<{ items: GuideDocument[] }>('/api/v1/account/guide/documents'),
  })

  const items = docs?.items ?? []
  const guideDoc = items.find((d) => d.type === 'GUIDE_LICENSE')
  const entertainerDoc = items.find((d) => d.type === 'ENTERTAINER_LICENSE')
  const hasLicense = !!(guideDoc || entertainerDoc)
  const isCompanion = !hasLicense && profile?.guide_type === 'COMPANION'

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guide-documents'] })
    qc.invalidateQueries({ queryKey: ['guide-profile'] })
  }

  const companionMutation = useMutation({
    mutationFn: (asCompanion: boolean) =>
      guideApi.updateProfile(guideProfilePayload(profile ?? {}, asCompanion ? 'COMPANION' : 'GUIDE')),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Документи</h2>
        <p className="mt-2 text-sm text-stone-600">
          Завантажте ліцензію — від цього залежить тип і бейдж у каталозі. Не блокує оплату та публікацію екскурсій.
        </p>
      </div>

      {profile && <CatalogStatusBanner profile={profile} />}

      <div className="card space-y-3">
        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            checked={isCompanion}
            disabled={!profile || companionMutation.isPending || hasLicense}
            onChange={(e) => companionMutation.mutate(e.target.checked)}
          />
          Я компаньйон (ліцензія не потрібна)
        </label>
        {hasLicense ? (
          <p className="text-sm text-stone-600">
            Є завантажена ліцензія — статус у каталозі визначається нею, позначка компаньйона не враховується.
          </p>
        ) : isCompanion ? (
          <p className="text-sm text-stone-600">
            Для компаньйона ліцензія не потрібна — бейдж «Компаньйон» відображається автоматично.
            Завантажте ліцензію, щоб стати гідом або конферансьє.
          </p>
        ) : null}
        {companionMutation.isError && (
          <p className="text-sm text-red-600">Не вдалося зберегти статус. Спробуйте ще раз.</p>
        )}
      </div>

      <GuideLicenseForm document={guideDoc} active={!!guideDoc} onUploaded={invalidate} />
      <EntertainerLicenseForm document={entertainerDoc} active={!!entertainerDoc} onUploaded={invalidate} />
    </div>
  )
}



function DocumentUploadForm({
  title,
  description,
  docType,
  document,
  active,
  onUploaded,
}: {
  title: string
  description: string
  docType: 'GUIDE_LICENSE' | 'ENTERTAINER_LICENSE'
  document?: GuideDocument
  active?: boolean
  onUploaded: () => void
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (next: File) => {
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', next)
      fd.append('type', docType)
      await guideApi.uploadDocument(fd)
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`card space-y-4 ${active ? 'ring-2 ring-brand-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
        {active && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-teal">
            Активний статус
          </span>
        )}
      </div>

      {document ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Завантажено: {formatSize(document.size)} · {document.mime_type}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Документ ще не завантажено.</p>
      )}

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => {
            const next = e.target.files?.[0]
            if (next) void uploadFile(next)
          }}
        />
        <p className="text-xs text-stone-500">PDF, JPG або PNG, до 10 МБ</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="btn-primary"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? 'Завантаження…' : document ? 'Замінити документ' : 'Завантажити'}
      </button>
    </div>
  )
}

function GuideLicenseForm(props: { document?: GuideDocument; active?: boolean; onUploaded: () => void }) {
  return (
    <DocumentUploadForm
      title="Ліцензія гіда"
      description="Після завантаження в каталозі відображається бейдж «Гід»."
      docType="GUIDE_LICENSE"
      {...props}
    />
  )
}

function EntertainerLicenseForm(props: { document?: GuideDocument; active?: boolean; onUploaded: () => void }) {
  return (
    <DocumentUploadForm
      title="Ліцензія конферансьє"
      description="Після завантаження в каталозі відображається бейдж «Конферансьє»."
      docType="ENTERTAINER_LICENSE"
      {...props}
    />
  )
}

