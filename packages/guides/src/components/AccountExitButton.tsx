import { useState } from 'react'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import { useStopImpersonation } from '@gaido/api-client/hooks/useStopImpersonation'

export default function AccountExitButton({ className = '', onExit }: { className?: string; onExit?: () => void }) {
  const { data: me } = useMe()
  const logout = useLogout()
  const stopImpersonation = useStopImpersonation()
  const [pending, setPending] = useState(false)
  if (!me) return null
  return (
    <button type="button" disabled={pending} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 ${className}`} onClick={async () => {
      if (pending) return
      setPending(true)
      try {
        if (me.impersonation?.active) stopImpersonation()
        else await logout()
        onExit?.()
      } finally { setPending(false) }
    }}>
      <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H5v14h4m6-14 7 7-7 7m7-7H9" /></svg>
      {pending ? 'Виходимо…' : me.impersonation?.active ? 'Повернутися в адмінку' : 'Вийти'}
    </button>
  )
}
