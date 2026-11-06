const KEY = 'gaido_funnel_session'

export function funnelSessionKey() {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(KEY)
    if (existing) return existing
    const next = crypto.randomUUID()
    window.localStorage.setItem(KEY, next)
    return next
  } catch {
    return ''
  }
}

export async function trackGuideEvent(body: {
  guide_id: number
  excursion_id?: number
  event_type: 'profile_view' | 'excursion_view' | 'contact_click'
  contact_type?: string
}) {
  const { api } = await import('@gaido/api-client/api/http')
  try {
    await api('/api/v1/guide-events', {
      method: 'POST',
      body: JSON.stringify({ ...body, session_key: funnelSessionKey() }),
    })
  } catch {
    /* analytics must not break the page */
  }
}
