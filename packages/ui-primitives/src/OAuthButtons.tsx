import { useQuery } from '@tanstack/react-query'
import { authApi } from '@gaido/api-client/api/auth'
import { authReturnOrigin } from '@gaido/site-urls/site'

const inactiveBtn =
  'btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface'

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
    <div className="space-y-2">
      {google && (
        <button type="button" className={inactiveBtn} disabled={blocked} aria-disabled={blocked} title={hint} onClick={() => start('google')}>
          Продовжити з Google
        </button>
      )}
      {facebook && (
        <button type="button" className={inactiveBtn} disabled={blocked} aria-disabled={blocked} title={hint} onClick={() => start('facebook')}>
          Продовжити з Facebook
        </button>
      )}
      {blocked && <p className="text-sm text-stone-500">{hint}</p>}
    </div>
  )
}
