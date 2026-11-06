import { useQueryClient } from '@tanstack/react-query'
import { clearActAsGuideId } from '../api/http'

export function stopImpersonationHref() {
  return '/svit/admin?tab=guides'
}

export function useStopImpersonation() {
  const qc = useQueryClient()

  return () => {
    clearActAsGuideId()
    qc.clear()
    window.location.assign(stopImpersonationHref())
  }
}
