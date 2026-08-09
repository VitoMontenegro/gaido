import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { setAccessToken } from '../api/http'

export function useLogout() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — token cleared locally anyway
    }
    setAccessToken(null)
    qc.clear()
    navigate('/')
  }
}
