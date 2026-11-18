import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { guideApi } from '@gaido/api-client/api/guide'
import ExcursionForm, {
  excursionWritePayload,
  type ExcursionFormData,
  type ExcursionPhotoPersist,
} from '../components/ExcursionForm'
import { mergePersistedPhotos, normalizeStructuredContent } from '../lib/excursionStructuredContent'
import { track } from '../lib/analytics'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function CreateExcursionPage() {
  const navigate = useNavigate()
  const createdId = useRef<number | null>(null)
  const lastSaved = useRef<ExcursionFormData | null>(null)

  useEffect(() => {
    track('wizard_start', { source: 'account' })
  }, [])

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      guideApi.createExcursion(body) as Promise<{ id: number; slug?: string }>,
  })

  /** Після створення чернетки гід залишається в майстрі: відкриваємо редагування на наступному кроці. */
  const continueInWizard = (id: number) => {
    try {
      // Календар зʼявляється лише після створення чернетки, тому повертаємо гіда на «Основне».
      sessionStorage.setItem(`excursion-form-tab:${id}`, 'basic')
    } catch {
      /* ignore */
    }
    navigate(`/account/guide/excursions/${id}/edit`, { replace: true })
  }

  return (
    <>
      <Seo title={pageTitle('Нова екскурсія')} noIndex />
      <div className="card max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm
          persistTabKey="new"
          submitLabel="Далі"
          successMessage="Чернетку збережено"
          onPersistPhotos={async (photos: ExcursionPhotoPersist) => {
            if (!photos.draft.city_id) {
              throw new Error('Оберіть місто на вкладці «Основне», щоб фото збереглось')
            }
            if (!createdId.current) {
              const created = await guideApi.createExcursion(photos.draft) as { id: number }
              createdId.current = created.id
              lastSaved.current = photos.draft
              return
            }
            const current = lastSaved.current ?? photos.draft
            const body = excursionWritePayload({
              ...current,
              cover_image_url: photos.cover_image_url,
              structured_content: mergePersistedPhotos(
                normalizeStructuredContent(current.structured_content),
                photos.structured_content,
              ),
            })
            await guideApi.updateExcursion(createdId.current, body)
            lastSaved.current = body
          }}
          onSubmit={async (data) => {
            if (createdId.current) {
              await guideApi.updateExcursion(createdId.current, data)
              continueInWizard(createdId.current)
              return
            }
            const created = await mutation.mutateAsync(data)
            createdId.current = created.id
            continueInWizard(created.id)
          }}
        />
      </div>
    </>
  )
}
