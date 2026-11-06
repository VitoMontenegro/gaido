import { Link } from 'react-router-dom'
import { BellIcon as BellOutline } from '@heroicons/react/24/outline'
import { BellIcon as BellSolid } from '@heroicons/react/24/solid'
import { useNotifications } from '@gaido/api-client/hooks/useNotifications'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import { cn } from '@gaido/ui-primitives/cn'

const INQUIRY_TYPES = new Set(['INQUIRY_NEW', 'INQUIRY_MESSAGE', 'INQUIRY_HELP', 'INQUIRY_UPDATE'])

export default function NotificationBell({ solidHeader }: { solidHeader: boolean }) {
  const { data = [] } = useNotifications()
  const isGuide = useHasRole('ROLE_GUIDE')
  const unread = data.filter((n) => !n.read_at && INQUIRY_TYPES.has(n.type)).length
  const href = isGuide ? '/account/guide/inquiries' : '/account/inquiries'

  return (
    <Link
      to={href}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition',
        unread > 0
          ? solidHeader
            ? 'bg-ink text-white'
            : 'bg-white/15 text-white drop-shadow-[0_1px_3px_rgba(15,26,40,0.65)]'
          : solidHeader
            ? 'text-ink hover:bg-sand-200/90'
            : 'text-white drop-shadow-[0_1px_3px_rgba(15,26,40,0.65)] hover:bg-white/20',
      )}
      aria-label={unread > 0 ? `Заявки, ${unread} непрочитаних` : 'Заявки'}
    >
      {unread > 0 ? <BellSolid className="h-5 w-5" /> : <BellOutline className="h-5 w-5" />}
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
