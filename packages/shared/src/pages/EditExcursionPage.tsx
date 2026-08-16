import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { guideApi } from '../api/guide'
import ExcursionForm, { type ExcursionFormData } from '../components/ExcursionForm'
import ExcursionDatesEditor from '../components/ExcursionDatesEditor'

export default function EditExcursionPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-excursion', id],
    queryFn: () => guideApi.getExcursion(id) as Promise<ExcursionFormData & { id?: number; slug?: string; status?: string }>,
  })

  if (isLoading) return <div className="card text-stone-600">Завантаження…</div>
  if (isError || !data) return <div className="card text-red-600">Екскурсію не знайдено</div>

  const excursionId = Number(id)

  return (
    <>
      <Helmet><title>Редагування — {data.title}</title></Helmet>
      <div className="max-w-4xl space-y-6">
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/account/guide/excursions" className="text-sm text-teal hover:underline">← Мої екскурсії</Link>
            {data.slug && (
              <Link to={`/excursion/${data.slug}`} className="btn-secondary py-1.5 text-sm">
                {data.status === 'PUBLISHED' ? 'Переглянути в каталозі' : 'Попередній перегляд'}
              </Link>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold">Редагування</h1>
          {saved && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-800">
              Зміни збережено
            </p>
          )}
          <ExcursionForm
            persistTabKey={id}
            initial={data}
            submitLabel="Зберегти"
            onSubmit={async (body) => {
              await guideApi.updateExcursion(excursionId, body)
              await qc.invalidateQueries({ queryKey: ['my-excursion', id] })
              await qc.invalidateQueries({ queryKey: ['my-excursions'] })
              setSaved(true)
            }}
          />
        </div>

        <div className="card">
          <ExcursionDatesEditor
            excursionId={excursionId}
            excursionType={data.type ?? 'INDIVIDUAL'}
            priceFrom={data.price_from ?? 0}
            currency={data.currency ?? 'EUR'}
          />
        </div>
      </div>
    </>
  )
}
