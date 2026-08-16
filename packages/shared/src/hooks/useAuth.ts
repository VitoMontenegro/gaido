import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { getAccessToken, setAccessToken, ApiClientError, bootstrapAuth } from '../api/http'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'UNAUTHORIZED') {
          setAccessToken(null)
        }
        throw error
      }
    },
    retry: false,
    enabled: !!getAccessToken(),
  })
}

export function useBootstrapAuth() {
  return useQuery({
    queryKey: ['auth-bootstrap'],
    queryFn: bootstrapAuth,
    staleTime: Infinity,
    retry: false,
  })
}

export function useHasRole(role: string) {
  const { data: me } = useMe()
  return me?.roles?.includes(role) ?? false
}
