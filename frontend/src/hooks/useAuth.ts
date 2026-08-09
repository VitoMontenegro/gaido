import { useQuery } from '@tanstack/react-query'
import { authApi, loadAccessToken, setAccessToken, ApiClientError } from '../api/client'

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
    enabled: !!loadAccessToken(),
  })
}

export function useHasRole(role: string) {
  const { data: me } = useMe()
  return me?.roles?.includes(role) ?? false
}
