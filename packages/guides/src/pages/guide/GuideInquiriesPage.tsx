import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { inquiriesApi, type Inquiry } from '@gaido/api-client/api/inquiries'
import { inquiryStatusLabel, inquiryWhenLabel } from '../../lib/inquiryLabels'

const FILTERS = [
  { id: 'new', label: 'Діалог', count: true },
  { id: 'discussing', label: 'В роботі', count: true },
  { id: 'pending', label: 'Очікують', count: true },
  { id: 'booked', label: 'Бронь', count: true },
  { id: 'archive', label: 'Архів', count: false },
] as const

function countFromItems(items: Inquiry[]) {
  return {
    new: items.filter((i) => i.status === 'new').length,
    discussing: items.filter((i) => i.status === 'discussing').length,
    pending: items.filter((i) => i.status === 'pending').length,
    booked: items.filter((i) => i.status === 'booked').length,
  }
}

export function GuideInquiriesPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'new'
  const { data, isLoading } = useQuery({
    queryKey: ['guide-inquiries', status],
    queryFn: () => inquiriesApi.guideInbox(status),
    placeholderData: keepPreviousData,
  })
  const open = useQuery({
    queryKey: ['guide-inquiries', 'open-counts'],
    queryFn: () => inquiriesApi.guideInbox('open'),
    staleTime: 15_000,
  })
  const items = data?.items ?? []
  const counts = data?.counts ?? open.data?.counts ?? countFromItems(open.data?.items ?? [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.count ? (counts[f.id] ?? 0) : undefined
          return (
            <button
              key={f.id}
              type="button"
              className={status === f.id ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
              onClick={() => setParams({ status: f.id })}
            >
              {f.label}
              {typeof n === 'number' ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>
      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
      {!isLoading && items.length === 0 && (
        <div className="card space-y-2">
          <h2 className="font-display text-lg font-bold">Тут з’являться запити туристів</h2>
          <p className="text-sm text-stone-600">
            Коли мандрівник натисне «Обговорити» на вашій екскурсії, заявка відкриється в цьому списку. Поки що можна
            оновити профіль і календар доступності.
          </p>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((inq) => (
          <li key={inq.id}>
            <Link
              to={`/account/guide/inquiries/${inq.id}`}
              className="card flex items-start justify-between gap-3 transition hover:bg-sand-50"
            >
              <div className="min-w-0">
                <p className="font-medium">{inq.tourist_name}</p>
                <p className="truncate text-sm text-stone-600">{inq.excursion_title || 'Заявка без екскурсії'}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {inquiryWhenLabel(inq)}
                  {inq.last_preview ? ` · ${inq.last_preview}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-stone-500">{inquiryStatusLabel(inq.status)}</p>
                {inq.unread > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-teal px-2 py-0.5 text-xs text-white">{inq.unread}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
