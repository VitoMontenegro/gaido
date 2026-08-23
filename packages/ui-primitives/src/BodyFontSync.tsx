import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { applyBodyFont } from './bodyFont'

/** Підтягує body_font з API і оновлює CSS-змінну --font-sans (Roboto / Rubik). */
export default function BodyFontSync() {
  const { data } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  useEffect(() => {
    applyBodyFont(data?.body_font)
  }, [data?.body_font])

  return null
}
