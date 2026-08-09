import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications'
import { useNotifications } from '../hooks/useNotifications'

const LABELS: Record<string, string> = {
  EXCURSION_APPROVED: 'Екскурсію схвалено',
  EXCURSION_REJECTED: 'Екскурсію відхилено',
  SUBSCRIPTION_ACTIVATED: 'Підписку активовано',
  SUBSCRIPTION_EXPIRED: 'Підписка закінчилась',
  NEW_REVIEW: 'Новий відгук',
  REVIEW_COMMENT: 'Відповідь на відгук',
}

export default function NotificationsPanel() {
  const { data = [], unread, isLoading } = useNotifications()
  const qc = useQueryClient()
  const mark = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Сповіщення</h2>
        {unread > 0 && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
            {unread} нових
          </span>
        )}
      </div>
      {isLoading && <p className="text-sm text-muted">Завантаження…</p>}
      {!isLoading && data.length === 0 && (
        <p className="text-sm text-muted">Поки немає сповіщень</p>
      )}
      <ul className="space-y-2">
        {data.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border px-3 py-2 text-sm ${n.read_at ? 'border-border bg-surface' : 'border-brand-200 bg-brand-50/40'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{LABELS[n.type] ?? n.type}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {new Date(n.created_at).toLocaleString('uk-UA')}
                </p>
              </div>
              {!n.read_at && (
                <button
                  type="button"
                  className="shrink-0 text-xs text-brand-700 hover:underline"
                  disabled={mark.isPending}
                  onClick={() => mark.mutate(n.id)}
                >
                  Прочитано
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
