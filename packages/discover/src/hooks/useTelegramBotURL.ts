import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import { setTelegramBotURL } from '../lib/telegramButtons'

export function useTelegramBotURL() {
  const { data } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.telegram_bot_url) {
      setTelegramBotURL(data.telegram_bot_url)
    }
  }, [data?.telegram_bot_url])

  return data?.telegram_bot_url
}
