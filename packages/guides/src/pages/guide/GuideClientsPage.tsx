import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inquiriesApi } from '@gaido/api-client/api/inquiries'
import { inquiryStatusLabel } from '../../lib/inquiryLabels'

export function GuideClientsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['guide-clients'],
    queryFn: () => inquiriesApi.clients(),
  })
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}
      {!isLoading && items.length === 0 && (
        <div className="card space-y-2">
          <h2 className="font-display text-lg font-bold">Клієнти з’являться після першого діалогу</h2>
          <p className="text-sm text-stone-600">
            Це не окрема база контактів: тут люди, з якими вже була заявка на платформі.
          </p>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.tourist_user_id}>
            <Link to={`/account/guide/inquiries/${c.last_inquiry_id}`} className="card flex justify-between gap-3 hover:bg-sand-50">
              <div>
                <p className="font-medium">{c.tourist_name}</p>
                <p className="text-sm text-stone-500">
                  {c.inquiry_count} заявки
                  {c.last_status ? ` · ${inquiryStatusLabel(c.last_status)}` : ''}
                </p>
              </div>
              <p className="text-xs text-stone-500">{new Date(c.last_inquiry_at).toLocaleDateString('uk-UA')}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
