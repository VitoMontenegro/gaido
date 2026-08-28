import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { guideApi } from '@gaido/api-client/api/guide'
import ExcursionForm, {
  excursionWritePayload,
  type ExcursionFormData,
  type ExcursionPhotoPersist,
} from '../components/ExcursionForm'
import { mergePersistedPhotos, normalizeStructuredContent } from '../lib/excursionStructuredContent'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function CreateExcursionPage() {
  const navigate = useNavigate()
  const createdId = useRef<number | null>(null)
  const lastSaved = useRef<ExcursionFormData | null>(null)

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      guideApi.createExcursion(body) as Promise<{ id: number; slug?: string }>,
    onSuccess: (created) => {
      const ref = created.slug || String(created.id)
      navigate(`/excursion/${ref}`)
    },
  })

  return (
    <>
      <Seo title={pageTitle('Нова екскурсія')} noIndex />
      <div className="card max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm
          persistTabKey="new"
          submitLabel="Зберегти"
          successMessage="Екскурсію створено"
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
              const ref = String(createdId.current)
              navigate(`/excursion/${ref}`)
              return
            }
            await mutation.mutateAsync(data)
          }}
        />
      </div>
    </>
  )
}
