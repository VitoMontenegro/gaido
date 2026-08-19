import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '@gaido/api-client/api/client'
import ExcursionForm, { type ExcursionFormData } from '../components/ExcursionForm'

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
      <Helmet><title>Редагування — {data.title}</title></Helmet>
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
              {isDraft && (
                <button
                  type="button"
                  className="btn-accent py-1.5 text-sm"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? 'Публікація…' : publishLabel}
                </button>
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
          {(submit.error || toDraft.error) && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(submit.error ?? toDraft.error)?.message}
            </p>
          )}
          <ExcursionForm
            persistTabKey={id}
            initial={data}
            submitLabel="Зберегти"
            successMessage="Зміни збережено"
            datesEditor={{
              excursionId,
              excursionType: data.type ?? 'INDIVIDUAL',
              priceFrom: data.price_from ?? 0,
              currency: data.currency ?? 'EUR',
            }}
            footerExtra={
              isDraft ? (
                <button
                  type="button"
                  className="btn-accent"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? 'Публікація…' : publishLabel}
                </button>
              ) : undefined
            }
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
