import { Link } from 'react-router-dom'
import { getAccessToken } from '@gaido/api-client/api/http'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import BrandLogo from './BrandLogo'
import { guidesUrl, servicesUrl, transportUrl } from '@gaido/site-urls/site'

export default function PortalHeader() {
  const { data: me, isLoading } = useMe()
  const logout = useLogout()
  const authPending = isLoading && !!getAccessToken()
  const isAdmin = me?.roles.includes('ROLE_ADMIN')
  const isModerator = me?.roles.includes('ROLE_MODERATOR')

  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/90 backdrop-blur-md">
        <div className="container-site flex h-14 flex-wrap items-center justify-between gap-2 py-2 md:h-[72px] md:flex-nowrap md:py-0">
          <BrandLogo compactOnMobile homeTo="/" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a href={servicesUrl('/')} className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
              Сервіси
            </a>
            <a href={transportUrl('/')} className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
              Міжнародні перевезення
            </a>
            <a href={guidesUrl('/')} className="btn-primary px-3 py-1.5 text-sm md:py-2">
              Гіди
            </a>
            {authPending ? (
              <div className="h-9 w-20 animate-pulse rounded-xl bg-sand-100/80" aria-hidden />
            ) : me ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="btn-secondary px-2.5 py-1.5 text-sm md:py-2">
                    Адмін
                  </Link>
                )}
                {!isAdmin && isModerator && (
                  <Link to="/moderator" className="btn-secondary px-2.5 py-1.5 text-sm md:py-2">
                    Модератор
                  </Link>
                )}
                {!isAdmin && !isModerator && (
                  <a href={guidesUrl('/account')} className="btn-secondary px-2.5 py-1.5 text-sm md:py-2">
                    Кабінет
                  </a>
                )}
                <button type="button" onClick={logout} className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
                  Вийти
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
                Вхід
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="site-header-spacer h-14 shrink-0 md:h-[72px]" aria-hidden />
    </>
  )
}
