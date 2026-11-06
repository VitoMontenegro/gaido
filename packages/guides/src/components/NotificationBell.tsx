import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellIcon as BellOutline } from '@heroicons/react/24/outline'
import { BellIcon as BellSolid } from '@heroicons/react/24/solid'
import { notificationsApi, type NotificationItem } from '@gaido/api-client/api/notifications'
import { useNotifications } from '@gaido/api-client/hooks/useNotifications'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import { cn } from '@gaido/ui-primitives/cn'
import { NOTIFICATION_LABELS, notificationHref, parseNotificationPayload } from '../lib/notificationLabels'

type Filter = 'all' | 'unread' | 'read'

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function itemPreview(n: NotificationItem) {
  const data = parseNotificationPayload(n.payload)
  if (n.type === 'REVIEW_DISPUTE' && data?.guide_name) return data.guide_name
  if (data?.status) return `Статус: ${data.status}`
  return data?.text_preview || ''
}

export default function NotificationBell({ solidHeader }: { solidHeader: boolean }) {
  const { data = [], unread, isLoading } = useNotifications()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const isGuide = useHasRole('ROLE_GUIDE')
  const isAdmin = useHasRole('ROLE_ADMIN')
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const mark = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = useMemo(() => {
    if (filter === 'unread') return data.filter((n) => !n.read_at)
    if (filter === 'read') return data.filter((n) => !!n.read_at)
    return data
  }, [data, filter])

  const openItem = (n: NotificationItem) => {
    if (!n.read_at) mark.mutate(n.id)
    const href = notificationHref(n.type, n.payload, isGuide, isAdmin)
    setOpen(false)
    if (href) navigate(href)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition',
          open || unread > 0
            ? solidHeader
              ? 'bg-ink text-white'
              : 'bg-white/15 text-white drop-shadow-[0_1px_3px_rgba(15,26,40,0.65)]'
            : solidHeader
              ? 'text-ink hover:bg-sand-200/90'
              : 'text-white drop-shadow-[0_1px_3px_rgba(15,26,40,0.65)] hover:bg-white/20',
        )}
        aria-label={unread > 0 ? `Сповіщення, ${unread} непрочитаних` : 'Сповіщення'}
        aria-expanded={open}
      >
        {unread > 0 ? <BellSolid className="h-5 w-5" /> : <BellOutline className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-divider bg-page shadow-[0_16px_40px_rgba(15,26,40,0.12)]">
          <div className="flex items-center justify-between gap-2 border-b border-divider px-4 py-3">
            <p className="font-display text-base font-bold">Сповіщення</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-teal hover:underline"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Прочитати всі
              </button>
            )}
          </div>
          <div className="flex gap-1 px-3 py-2">
            {([
              ['all', 'Усі'],
              ['unread', 'Непрочитані'],
              ['read', 'Прочитані'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs',
                  filter === id ? 'bg-teal text-white' : 'bg-sand-100 text-stone-600 hover:bg-sand-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="max-h-[min(70vh,28rem)] overflow-y-auto">
            {isLoading && <li className="px-4 py-6 text-sm text-stone-500">Завантаження…</li>}
            {!isLoading && items.length === 0 && (
              <li className="px-4 py-6 text-sm text-stone-500">Немає сповіщень у цьому списку</li>
            )}
            {items.map((n) => {
              const unreadItem = !n.read_at
              const preview = itemPreview(n)
              return (
                <li key={n.id} className="border-t border-divider">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-sand-50',
                      unreadItem && 'bg-teal-50/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        unreadItem ? 'bg-teal text-white' : 'bg-sand-200 text-stone-600',
                      )}
                    >
                      {(NOTIFICATION_LABELS[n.type] ?? n.type).slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block', unreadItem ? 'font-semibold text-ink' : 'text-ink')}>
                        {NOTIFICATION_LABELS[n.type] ?? n.type}
                      </span>
                      {preview && <span className="mt-0.5 block truncate text-xs text-stone-500">{preview}</span>}
                      <span className="mt-1 block text-xs text-stone-400">{formatWhen(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-divider px-4 py-2 text-center">
            <Link to={isGuide ? '/account/guide' : '/account'} className="text-xs text-teal hover:underline" onClick={() => setOpen(false)}>
              Кабінет
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
