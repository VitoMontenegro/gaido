import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { transportApi } from '@gaido/api-client/api/transport'
import { pageTitle } from '@gaido/site-urls/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import CityPicker from '../components/CityPicker'
import RideCard from '../components/RideCard'
import { Seo } from '../lib/seo'
import { POPULAR_ROUTES } from '../lib/popularRoutes'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const fromCityId = Number(params.get('from_city_id') || 0) || undefined
  const toCityId = Number(params.get('to_city_id') || 0) || undefined
  const dateFrom = params.get('date_from') || ''
  const kind = params.get('kind') || ''
  const carrierType = params.get('carrier_type') || ''
  const verifiedUkrainian = params.get('verified_ukrainian') === '1'
  const hasRoute = Boolean(fromCityId && toCityId)

  const [draftFrom, setDraftFrom] = useState(fromCityId)
  const [draftTo, setDraftTo] = useState(toCityId)
  const [draftDate, setDraftDate] = useState(dateFrom)

  useEffect(() => {
    setDraftFrom(fromCityId)
    setDraftTo(toCityId)
    setDraftDate(dateFrom)
  }, [fromCityId, toCityId, dateFrom])

  const searchParams = {
    from_city_id: fromCityId,
    to_city_id: toCityId,
    date_from: dateFrom || undefined,
    kind: kind || undefined,
    carrier_type: carrierType || undefined,
    verified_ukrainian: verifiedUkrainian ? '1' : undefined,
    limit: 50,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transport-search', searchParams],
    queryFn: () => transportApi.search(searchParams),
  })

  const runSearch = () => {
    const next = new URLSearchParams()
    if (draftFrom) next.set('from_city_id', String(draftFrom))
    if (draftTo) next.set('to_city_id', String(draftTo))
    if (draftDate) next.set('date_from', draftDate)
    if (kind) next.set('kind', kind)
    if (carrierType) next.set('carrier_type', carrierType)
    if (verifiedUkrainian) next.set('verified_ukrainian', '1')
    setParams(next)
  }

  const items = data?.items ?? []
  const total = data?.total

  return (
    <>
      <Seo
        title={pageTitle('Пошук рейсів')}
        description="Пошук міжнародних рейсів: маршрутки та попутки для українців за кордоном."
        path="/search"
      />
      <Breadcrumbs items={[{ label: 'Пошук рейсів' }]} />
      <div className="container-site space-y-8 py-10">
        <div className="max-w-2xl space-y-3">
          <h1 className="section-title">Пошук рейсів</h1>
          <p className="text-muted">
            Оберіть міста відправлення та прибуття або перегляньте всі опубліковані рейси.
          </p>
        </div>

        <section className="card space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <CityPicker label="Звідки" value={draftFrom} onChange={(id) => setDraftFrom(id)} />
            <CityPicker label="Куди" value={draftTo} onChange={(id) => setDraftTo(id)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Дата від</label>
              <input className="input" type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Тип рейсу</label>
              <select
                className="input"
                value={kind}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  const v = e.target.value
                  if (v) next.set('kind', v)
                  else next.delete('kind')
                  setParams(next)
                }}
              >
                <option value="">Усі</option>
                <option value="regular">Регулярні</option>
                <option value="occasional">Попутки</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Тип перевізника</label>
              <select
                className="input"
                value={carrierType}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  const v = e.target.value
                  if (v) next.set('carrier_type', v)
                  else next.delete('carrier_type')
                  setParams(next)
                }}
              >
                <option value="">Усі</option>
                <option value="company">Компанія</option>
                <option value="fop">ФОП</option>
                <option value="private">Приватний</option>
                <option value="individual">Фізособа</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={verifiedUkrainian}
              onChange={(e) => {
                const next = new URLSearchParams(params)
                if (e.target.checked) next.set('verified_ukrainian', '1')
                else next.delete('verified_ukrainian')
                setParams(next)
              }}
            />
            Лише верифіковані 🇺🇦 перевізники
          </label>
          <button type="button" className="btn-accent" onClick={runSearch}>
            {hasRoute ? 'Знайти рейси' : 'Оновити результати'}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Популярні маршрути</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_ROUTES.map((route) => (
              <Link
                key={route.label}
                to={`/routes/${route.from}/${route.to}`}
                className="rounded-full border border-divider bg-surface px-4 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50"
              >
                {route.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">
            {hasRoute ? 'Результати пошуку' : 'Актуальні рейси'}
          </h2>
          {isLoading ? (
            <p className="text-muted">Завантаження…</p>
          ) : isError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Не вдалося завантажити рейси. Спробуйте оновити сторінку пізніше.
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Знайдено: {total ?? items.length}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-divider bg-sand-50 px-4 py-6 text-sm text-muted">
              {hasRoute ? (
                <p>Рейсів за цим маршрутом поки немає. Спробуйте інші міста або дату.</p>
              ) : (
                <p>Опублікованих рейсів поки немає. Загляньте пізніше або оберіть інший маршрут.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
