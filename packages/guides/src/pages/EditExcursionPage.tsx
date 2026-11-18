import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '@gaido/api-client/api/client'
import { getPublishMissing } from '@gaido/api-client/api/http'
import ExcursionForm, { excursionWritePayload, type ExcursionFormData, type ExcursionPhotoPersist } from '../components/ExcursionForm'
import { mergePersistedPhotos, normalizeStructuredContent } from '../lib/excursionStructuredContent'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function EditExcursionPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [published, setPublished] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-excursion', id],
    queryFn: () => guideApi.getExcursion(id) as Promise<ExcursionFormData & { id?: number; slug?: string; status?: string }>,
  })

  const { data: listMeta } = useQuery({
    queryKey: ['my-excursions'],
    queryFn: () => api<{ moderation_enabled: boolean }>('/api/v1/account/guide/excursions'),
  })

  const submit = useMutation({
    mutationFn: () => guideApi.submitExcursion(Number(id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-excursion', id] })
      await qc.invalidateQueries({ queryKey: ['my-excursions'] })
      setPublished(true)
    },
  })

  const toDraft = useMutation({
    mutationFn: () => guideApi.draftExcursion(Number(id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-excursion', id] })
      await qc.invalidateQueries({ queryKey: ['my-excursions'] })
      setPublished(false)
    },
  })

  if (isLoading) return <div className="card text-stone-600">Завантаження…</div>
  if (isError || !data) return <div className="card text-red-600">Екскурсію не знайдено</div>

  const excursionId = Number(id)
  const moderationEnabled = listMeta?.moderation_enabled ?? true
  const publishLabel = moderationEnabled ? 'На модерацію' : 'Опублікувати'
  const isDraft = data.status === 'DRAFT'
  const canUnpublish =
    data.status === 'PUBLISHED' || data.status === 'PENDING_MODERATION' || data.status === 'REJECTED'

  return (
    <>
      <Seo title={pageTitle(`Редагування — ${data.title}`)} noIndex />
      <div className="max-w-4xl space-y-6">
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/account/guide/excursions" className="text-sm text-teal hover:underline">
              ← Мої екскурсії
            </Link>
            <div className="flex flex-wrap gap-2">
              {data.slug && (
                <Link to={`/excursion/${data.slug}`} className="btn-secondary py-1.5 text-sm">
                  {data.status === 'PUBLISHED' ? 'Переглянути в каталозі' : 'Попередній перегляд'}
                </Link>
              )}
              {canUnpublish && (
                <button
                  type="button"
                  className="btn-secondary py-1.5 text-sm"
                  disabled={toDraft.isPending}
                  onClick={() => toDraft.mutate()}
                >
                  У чернетку
                </button>
              )}
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold">Редагування</h1>
          {published && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-800">
              {moderationEnabled
                ? 'Екскурсію надіслано на модерацію'
                : 'Екскурсію опубліковано'}
            </p>
          )}
          {(submit.error || toDraft.error) && getPublishMissing(submit.error).length === 0 && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(submit.error ?? toDraft.error)?.message}
            </p>
          )}
          <ExcursionForm
            persistTabKey={id}
            initial={data}
            submitLabel="Зберегти зміни"
            successMessage="Зміни збережено"
            datesEditor={{
              excursionId,
              excursionType: data.type ?? 'INDIVIDUAL',
              priceFrom: data.price_from ?? 0,
              currency: data.currency ?? 'EUR',
            }}
            publishAction={
              isDraft
                ? {
                    label: publishLabel,
                    pending: submit.isPending,
                    missing: getPublishMissing(submit.error),
                    onPublish: async () => {
                      try {
                        await submit.mutateAsync()
                      } catch {
                        /* помилку показує форма (422) або блок угорі */
                      }
                    },
                  }
                : undefined
            }
            onPersistPhotos={async (photos: ExcursionPhotoPersist) => {
              const current = (qc.getQueryData(['my-excursion', id]) ?? data) as ExcursionFormData
              const body = excursionWritePayload({
                ...current,
                cover_image_url: photos.cover_image_url,
                structured_content: mergePersistedPhotos(
                  normalizeStructuredContent(current.structured_content),
                  photos.structured_content,
                ),
              })
              await guideApi.updateExcursion(excursionId, body)
              qc.setQueryData(['my-excursion', id], (prev) =>
                prev && typeof prev === 'object' ? { ...prev, ...body } : { ...current, ...body },
              )
            }}
            onSubmit={async (body) => {
              await guideApi.updateExcursion(excursionId, body)
              await qc.invalidateQueries({ queryKey: ['my-excursion', id] })
              await qc.invalidateQueries({ queryKey: ['my-excursions'] })
              setPublished(false)
            }}
          />
        </div>
      </div>
    </>
  )
}
