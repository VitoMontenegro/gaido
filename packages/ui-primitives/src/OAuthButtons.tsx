import { useQuery } from '@tanstack/react-query'
import { authApi } from '@gaido/api-client/api/auth'
import { authReturnOrigin } from '@gaido/site-urls/site'

const oauthBtn =
  'inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-ink bg-white px-3 py-2 text-base font-semibold text-ink shadow-sm transition hover:bg-sand-50 focus:outline-none focus:ring-2 focus:ring-ink/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white'

function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z" />
    </svg>
  )
}

export default function OAuthButtons({
  acceptPrivacy,
  acceptSiteRules,
  intent = 'login',
}: {
  acceptPrivacy: boolean
  acceptSiteRules: boolean
  intent?: 'login' | 'link'
}) {
  const providers = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: authApi.oauthProviders,
    staleTime: 60_000,
  })
  const google = providers.data?.google
  const facebook = providers.data?.facebook
  if (!google && !facebook) return null

  const blocked = intent !== 'link' && (!acceptPrivacy || !acceptSiteRules)
  const hint = blocked ? 'Позначте обидві згоди, щоб кнопка стала активною' : undefined

  const start = (provider: 'google' | 'facebook') => {
    if (blocked) return
    const url = authApi.oauthStartUrl(provider, {
      return_origin: authReturnOrigin(),
      accept_privacy: acceptPrivacy,
      accept_site_rules: acceptSiteRules,
      intent,
    })
    window.location.assign(url)
  }

  return (
    <div className="space-y-3">
      {intent !== 'link' && (
        <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-stone-400">
          <span className="h-px flex-1 bg-divider" />
          або
          <span className="h-px flex-1 bg-divider" />
        </p>
      )}
      {google && (
        <button type="button" className={oauthBtn} disabled={blocked} aria-disabled={blocked} title={hint} onClick={() => start('google')}>
          <GoogleMark />
          Продовжити з Google
        </button>
      )}
      {facebook && (
        <button type="button" className={oauthBtn} disabled={blocked} aria-disabled={blocked} title={hint} onClick={() => start('facebook')}>
          <FacebookMark />
          Продовжити з Facebook
        </button>
      )}
      {blocked && <p className="text-sm text-stone-500">{hint}</p>}
    </div>
  )
}
