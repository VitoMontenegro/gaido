import { getActAsGuideId } from '@gaido/api-client/api/http'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { useStopImpersonation } from '@gaido/api-client/hooks/useStopImpersonation'

export default function ImpersonationBanner() {
  const { data: me } = useMe()
  const stop = useStopImpersonation()
  const info = me?.impersonation
  const stored = getActAsGuideId()
  if (!info?.active && !stored) return null

  const name = info?.display_name?.trim() || 'гід'

  return (
    <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-600 px-4 py-2 text-sm text-white">
      <p>
        Ви в кабінеті гіда <span className="font-medium">{name}</span>
        {info?.actor_login ? ` (адмін ${info.actor_login})` : ''}
      </p>
      <button
        type="button"
        className="rounded-lg bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25"
        onClick={stop}
      >
        Повернутися в адмінку
      </button>
    </div>
  )
}
