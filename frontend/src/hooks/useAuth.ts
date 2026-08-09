import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/client'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: false,
  })
}

export function useHasRole(role: string) {
  const { data: me } = useMe()
  return me?.roles?.includes(role) ?? false
}
