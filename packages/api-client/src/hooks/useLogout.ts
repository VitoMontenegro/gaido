import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { clearActAsGuideId, setAccessToken } from '../api/http'

export function useLogout() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — token cleared locally anyway
    }
    clearActAsGuideId()
    setAccessToken(null)
    qc.clear()
    navigate('/')
  }
}
