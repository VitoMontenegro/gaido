import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard, { ExcursionCardGrid } from '../components/ExcursionCard'
import type { ExcursionItem } from '../components/excursionUi'
import { pageTitle } from '../lib/brand'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [input, setInput] = useState(q)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = input.trim()
      if (trimmed === q) return
      setParams(trimmed ? { q: trimmed } : {}, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [input, q, setParams])

  const { data, isFetching } = useQuery({
    queryKey: ['excursions', q],
    queryFn: () => catalogApi.excursions(q ? { q } : undefined) as Promise<{ items: ExcursionItem[] }>,
  })

  return (
    <>
      <Helmet><title>{pageTitle('Пошук')}</title></Helmet>
      <Breadcrumbs items={[{ label: 'Пошук' }]} />
      <div className="container-site py-5 md:py-8">
        <h1 className="section-title mb-1 text-2xl md:text-[28px]">Пошук</h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">Знайдіть екскурсію за містом, темою або назвою</p>
        <input
          className="input mb-6 max-w-xl md:mb-8"
          placeholder="Місто, тема, назва..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
        {isFetching && q && (
          <p className="mb-4 text-sm text-muted">Пошук…</p>
        )}
        <ExcursionCardGrid>
          {(data?.items ?? []).map((e) => (
            <ExcursionCard key={e.id} e={e} compact />
          ))}
        </ExcursionCardGrid>
        {!isFetching && (data?.items ?? []).length === 0 && q && (
          <p className="mt-4 text-muted">За запитом «{q}» нічого не знайдено.</p>
        )}
      </div>
    </>
  )
}
