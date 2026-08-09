import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import ExcursionForm from '../components/ExcursionForm'

export default function CreateExcursionPage() {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/api/v1/account/guide/excursions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => navigate('/account/guide/excursions'),
  })

  return (
    <>
      <Helmet><title>Нова екскурсія</title></Helmet>
      <div className="card max-w-3xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm submitLabel="Створити" onSubmit={async (data) => { await mutation.mutateAsync(data) }} />
      </div>
    </>
  )
}
