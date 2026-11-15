import { useQuery } from '@tanstack/react-query'
import { authApi } from '@gaido/api-client/api/auth'
import { authReturnOrigin } from '@gaido/site-urls/site'

export default function OAuthButtons({
  acceptPrivacy,
  acceptSiteRules,
  intent = 'login',
  disabled,
}: {
  acceptPrivacy: boolean
  acceptSiteRules: boolean
  intent?: 'login' | 'link'
  disabled?: boolean
}) {
  const providers = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: authApi.oauthProviders,
    staleTime: 60_000,
  })
  const google = providers.data?.google
  const facebook = providers.data?.facebook
  if (!google && !facebook) return null

  const start = (provider: 'google' | 'facebook') => {
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
        <button type="button" className="btn-secondary w-full" disabled={disabled} onClick={() => start('google')}>
          Продовжити з Google
        </button>
      )}
      {facebook && (
        <button type="button" className="btn-secondary w-full" disabled={disabled} onClick={() => start('facebook')}>
          Продовжити з Facebook
        </button>
      )}
    </div>
  )
}
