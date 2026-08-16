import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ExcursionCard, { ExcursionCardGrid } from '../components/ExcursionCard'
import { DateFilterStrip } from '../components/PublicDateCalendar'
import type { ExcursionItem } from '../components/excursionUi'
import { pageTitle } from '@gaido/site-urls/brand'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const date = params.get('date') ?? ''
  const [input, setInput] = useState(q)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = input.trim()
      if (trimmed === q) return
      const next: Record<string, string> = {}
      if (trimmed) next.q = trimmed
      if (date) next.date = date
      setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [input, q, date, setParams])

  const queryParams: Record<string, string> = {}
  if (q) queryParams.q = q
  if (date) queryParams.date = date

  const { data, isFetching } = useQuery({
    queryKey: ['excursions', q, date],
    queryFn: () => catalogApi.excursions(queryParams) as Promise<{ items: ExcursionItem[] }>,
  })

  const setDate = (value: string) => {
    const next: Record<string, string> = {}
    if (q) next.q = q
    if (value) next.date = value
    setParams(next, { replace: true })
  }

  return (
    <>
      <Helmet><title>{pageTitle('Пошук')}</title></Helmet>
      <Breadcrumbs items={[{ label: 'Пошук' }]} />
      <div className="container-site py-5 md:py-8">
        <h1 className="section-title mb-1 text-2xl md:text-[28px]">Пошук</h1>
        <p className="mb-4 text-sm text-muted md:mb-6 md:text-base">Знайдіть екскурсію за містом, темою, назвою або датою</p>
        <input
          className="input mb-4 max-w-xl md:mb-6"
          placeholder="Місто, тема, назва..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
        <div className="mb-6 md:mb-8">
          <DateFilterStrip
            selected={date || null}
            onSelect={(dateKey) => setDate(dateKey === date ? '' : dateKey)}
          />
        </div>
        {date && (
          <p className="mb-4 text-sm text-stone-600">
            Екскурсії на {new Date(`${date}T12:00:00`).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            <button type="button" className="text-brand-700 hover:underline" onClick={() => setDate('')}>
              скинути дату
            </button>
          </p>
        )}
        {isFetching && (q || date) && (
          <p className="mb-4 text-sm text-muted">Пошук…</p>
        )}
        <ExcursionCardGrid>
          {(data?.items ?? []).map((e) => (
            <ExcursionCard key={e.id} e={e} compact />
          ))}
        </ExcursionCardGrid>
        {!isFetching && (data?.items ?? []).length === 0 && (q || date) && (
          <p className="mt-4 text-muted">
            {date && q
              ? `За запитом «${q}» на обрану дату нічого не знайдено.`
              : date
                ? 'На обрану дату немає доступних екскурсій.'
                : `За запитом «${q}» нічого не знайдено.`}
          </p>
        )}
      </div>
    </>
  )
}
