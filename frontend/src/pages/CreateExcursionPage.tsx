import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { guideApi } from '../api/guide'
import ExcursionForm from '../components/ExcursionForm'

export default function CreateExcursionPage() {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => guideApi.createExcursion(body),
    onSuccess: () => navigate('/account/guide/excursions'),
  })

  return (
    <>
      <Helmet><title>Нова екскурсія</title></Helmet>
      <div className="card max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm
          persistTabKey="new"
          submitLabel="Створити"
          onSubmit={async (data) => { await mutation.mutateAsync(data) }}
        />
      </div>
    </>
  )
}
