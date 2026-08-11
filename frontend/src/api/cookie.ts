import { api } from './http'

export type CookieBrowserInfo = {
  language: string
  languages: string[]
  platform: string
  cookie_enabled: boolean
  timezone: string
  screen: { width: number; height: number }
  viewport: { width: number; height: number }
}

export type CookieConsentRecord = {
  id: number
  consent_token: string
  user_id?: number | null
  ip: string
  user_agent: string
  accept_language?: string
  referer?: string
  page_url?: string
  browser_info?: CookieBrowserInfo
  created_at: string
}

export const cookieApi = {
  accept: (body: { consent_token: string; page_url?: string; browser_info?: CookieBrowserInfo }) =>
    api<{ id: number; status: string }>('/api/v1/cookie-consent', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
