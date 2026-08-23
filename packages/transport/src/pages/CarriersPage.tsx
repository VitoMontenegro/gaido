import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { carrierApi } from '@gaido/api-client/api/carrier'
import Breadcrumbs from '../components/Breadcrumbs'
import CarrierCard, { CarrierCardGrid } from '../components/CarrierCard'
import CityPicker from '../components/CityPicker'
import { Seo } from '../lib/seo'
import { seoCarriersDescription, seoCarriersTitle } from '../lib/seoTemplates'

export default function CarriersPage() {
  const [carrierType, setCarrierType] = useState('')
  const [verifiedUkrainian, setVerifiedUkrainian] = useState(false)
  const [baseCityId, setBaseCityId] = useState<number>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carriers-list', carrierType, verifiedUkrainian, baseCityId],
    queryFn: () =>
      carrierApi.list({
        carrier_type: carrierType || undefined,
        verified_ukrainian: verifiedUkrainian ? '1' : undefined,
        base_city_id: baseCityId,
        limit: 50,
      }),
  })

  const items = data?.items ?? []

  return (
    <>
      <Seo
        title={seoCarriersTitle()}
        description={seoCarriersDescription(data?.total)}
        path="/carriers"
      />
      <Breadcrumbs items={[{ label: 'Перевізники' }]} />
      <div className="container-site space-y-6 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="section-title">Перевізники</h1>
          <p className="text-muted">Компанії, ФОП та приватні водії з верифікацією та рейтингом.</p>
        </div>

        <section className="card space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Тип</label>
              <select className="input" value={carrierType} onChange={(e) => setCarrierType(e.target.value)}>
                <option value="">Усі</option>
                <option value="company">Компанія</option>
                <option value="fop">ФОП</option>
                <option value="private">Приватний</option>
                <option value="individual">Фізособа</option>
              </select>
            </div>
            <CityPicker label="Місто бази" value={baseCityId} onChange={(id) => setBaseCityId(id || undefined)} />
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={verifiedUkrainian} onChange={(e) => setVerifiedUkrainian(e.target.checked)} />
                Лише 🇺🇦 верифіковані
              </label>
            </div>
          </div>
        </section>

        {isLoading ? (
          <p className="text-muted">Завантаження…</p>
        ) : isError ? (
          <p className="text-muted">Не вдалося завантажити перевізників.</p>
        ) : items.length ? (
          <>
            <p className="text-sm text-muted">Знайдено: {data?.total ?? items.length}</p>
            <CarrierCardGrid>
              {items.map((c) => (
                <CarrierCard key={c.provider_id} carrier={c} compact />
              ))}
            </CarrierCardGrid>
          </>
        ) : (
          <p className="text-muted">Перевізників за цими фільтрами поки немає.</p>
        )}
      </div>
    </>
  )
}
