import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { guideApi } from '@gaido/api-client/api/guide'
import ExcursionForm from '../components/ExcursionForm'

export default function CreateExcursionPage() {
  const navigate = useNavigate()
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
      <Helmet><title>Нова екскурсія</title></Helmet>
      <div className="card max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm
          persistTabKey="new"
          submitLabel="Зберегти"
          onSubmit={async (data) => { await mutation.mutateAsync(data) }}
        />
      </div>
    </>
  )
}
