import { useCallback, useMemo, useState } from 'react'
import { cookieApi, type CookieBrowserInfo } from '@gaido/api-client/api/cookie'

const STORAGE_KEY = 'cookie_consent_token'

function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* ignore */
  }
}

function createToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function collectBrowserInfo(): CookieBrowserInfo {
  return {
    language: navigator.language,
    languages: [...navigator.languages],
    platform: navigator.platform,
    cookie_enabled: navigator.cookieEnabled,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: { width: window.screen.width, height: window.screen.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }
}

export function useCookieConsent() {
  const [accepted, setAccepted] = useState(() => !!readToken())
  const [submitting, setSubmitting] = useState(false)

  const token = useMemo(() => readToken() ?? createToken(), [])

  const accept = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    writeToken(token)
    setAccepted(true)
    try {
      await cookieApi.accept({
        consent_token: token,
        page_url: window.location.href,
        browser_info: collectBrowserInfo(),
      })
    } catch {
      /* banner stays hidden; consent stored locally */
    } finally {
      setSubmitting(false)
    }
  }, [submitting, token])

  return { visible: !accepted, accept, submitting }
}
