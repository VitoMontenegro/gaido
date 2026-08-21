import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { guideApi } from '@gaido/api-client/api/guide'
import ExcursionForm from '../components/ExcursionForm'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

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
      <Seo title={pageTitle('Нова екскурсія')} noIndex />
      <div className="card max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Нова екскурсія</h1>
        <ExcursionForm
          persistTabKey="new"
          submitLabel="Зберегти"
          successMessage="Екскурсію створено"
          onSubmit={async (data) => { await mutation.mutateAsync(data) }}
        />
      </div>
    </>
  )
}
