import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inquiriesApi } from '@gaido/api-client/api/inquiries'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'
import { inquiryStatusLabel, inquiryWhenLabel } from '../lib/inquiryLabels'
import InquiryThread from '../components/crm/InquiryThread'

export default function TouristInquiriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-inquiries'],
    queryFn: () => inquiriesApi.mine(),
  })
  const items = data?.items ?? []

  return (
    <>
      <Seo title={pageTitle('Мої заявки')} path="/account/inquiries" noIndex />
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Заявки гідам</h1>
        {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
        {!isLoading && items.length === 0 && (
          <p className="card text-sm text-stone-600">Поки немає заявок. На сторінці екскурсії натисніть «Обговорити».</p>
        )}
        <ul className="space-y-2">
          {items.map((inq) => (
            <li key={inq.id}>
              <Link to={`/account/inquiries/${inq.id}`} className="card flex justify-between gap-3 hover:bg-sand-50">
                <div>
                  <p className="font-medium">{inq.guide_name}</p>
                  <p className="text-sm text-stone-600">{inq.excursion_title || 'Заявка'}</p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>{inquiryStatusLabel(inq.status)}</p>
                  <p>{inquiryWhenLabel(inq)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export function TouristInquiryThreadPage() {
  const id = Number(useParams().id)
  return (
    <>
      <Seo title={pageTitle('Чат із гідом')} path="/account/inquiries" noIndex />
      {id ? <InquiryThread inquiryId={id} viewer="tourist" /> : <p>Невірний запит.</p>}
    </>
  )
}
