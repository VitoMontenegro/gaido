import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { guideApi } from '../api/guide'
import ExcursionForm, { type ExcursionFormData } from '../components/ExcursionForm'

export default function EditExcursionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-excursion', id],
    queryFn: () => guideApi.getExcursion(id) as Promise<ExcursionFormData>,
  })

  if (isLoading) return <div className="card text-stone-600">Завантаження…</div>
  if (isError || !data) return <div className="card text-red-600">Екскурсію не знайдено</div>

  return (
    <>
      <Helmet><title>Редагування — {data.title}</title></Helmet>
      <div className="card max-w-3xl space-y-4">
        <Link to="/account/guide/excursions" className="text-sm text-brand-700 hover:underline">← Мої екскурсії</Link>
        <h1 className="font-display text-2xl font-bold">Редагування</h1>
        <ExcursionForm
          initial={data}
          submitLabel="Зберегти"
          onSubmit={async (body) => {
            await guideApi.updateExcursion(Number(id), body)
            navigate('/account/guide/excursions')
          }}
        />
      </div>
    </>
  )
}
