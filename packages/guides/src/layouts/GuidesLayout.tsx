import { Link, Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import { useBootstrapAuth, useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import { useNotifications } from '@gaido/api-client/hooks/useNotifications'
import ErrorBoundary from '@gaido/ui-primitives/ErrorBoundary'
import GuidesHeader from '../components/GuidesHeader'
import GuidesFooter from '../components/GuidesFooter'
import CookieBanner from '../components/CookieBanner'
import { useTelegramBotURL } from '../hooks/useTelegramBotURL'
import AccountNavLink from '../components/crm/AccountNavLink'

export function GuidesPublicLayout() {
  const logout = useLogout()
  useTelegramBotURL()

  useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <GuidesHeader onLogout={logout} />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <GuidesFooter />
      <CookieBanner />
    </div>
  )
}

export function GuidesAccountLayout() {
  const logout = useLogout()
  const { isLoading: authLoading } = useBootstrapAuth()
  const { data: me, isLoading, isError } = useMe()
  const isGuide = useHasRole('ROLE_GUIDE')
  const isAdmin = useHasRole('ROLE_ADMIN')
  const isModerator = useHasRole('ROLE_MODERATOR')
  const { unread } = useNotifications()

  if (authLoading || isLoading) {
    return (
      <div className="container-site py-12">
        <div className="card text-muted">Завантаження…</div>
      </div>
    )
  }

  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="container-site grid gap-6 py-8 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit space-y-1 p-4">
          <Link to="/" className="mb-3 block font-display text-lg font-medium text-ink transition hover:opacity-75">
            ← На головну
          </Link>
          <p className="section-title-sm mb-4">Кабінет</p>
          <AccountNavLink to="/account" end>
            Огляд{unread > 0 ? ` (${unread})` : ''}
          </AccountNavLink>
          <AccountNavLink to="/account/favorites">Обране</AccountNavLink>
          <AccountNavLink to="/account/settings">Налаштування</AccountNavLink>
          {isGuide && (
            <AccountNavLink to="/account/guide/billing">Білінг</AccountNavLink>
          )}
          {isGuide && (
            <AccountNavLink to="/account/guide" exceptPrefixes={['/account/guide/billing']}>
              Кабінет гіда
            </AccountNavLink>
          )}
          {(isAdmin || isModerator) && (
            <>
              <p className="section-title-sm mb-1 mt-4 px-3 pt-2">Адміністрування</p>
              {isModerator && <AccountNavLink to="/moderator">Модератор</AccountNavLink>}
              {isAdmin && (
                <>
                  <AccountNavLink to="/admin">Аналітика</AccountNavLink>
                  <AccountNavLink to="/downloads?app=web-prod-2026">Деплой</AccountNavLink>
                </>
              )}
            </>
          )}
          <p className="px-3 pt-3 text-xs text-muted-light">{me.login}</p>
          <button type="button" onClick={logout} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50">
            Вийти
          </button>
        </aside>
        <div><Outlet /></div>
      </div>
    </div>
  )
}

export function GuidesAdminLayout() {
  const logout = useLogout()
  const { isLoading: authLoading } = useBootstrapAuth()
  const { data: me, isLoading, isError } = useMe()
  const isModerator = useHasRole('ROLE_MODERATOR')
  const isAdmin = useHasRole('ROLE_ADMIN')

  if (authLoading || isLoading) {
    return (
      <div className="container-site py-12">
        <div className="card text-muted">Завантаження…</div>
      </div>
    )
  }

  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }

  if (!isAdmin && !isModerator) {
    return (
      <div className="min-h-screen bg-page">
        <GuidesHeader onLogout={logout} />
        <div className="container-site py-12">
          <div className="card space-y-2">
            <h1 className="font-display text-xl font-bold">Доступ заборонено</h1>
            <p className="text-sm text-muted">Ця сторінка доступна лише адміністраторам.</p>
            <Link to="/" className="link-accent text-sm">
              На головну
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <GuidesHeader onLogout={logout} />
      <div className="container-site grid gap-6 py-8 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit space-y-1 p-4">
          <Link to="/" className="mb-3 block font-display text-lg font-medium text-ink transition hover:opacity-75">
            ← На головну
          </Link>
          <p className="section-title-sm mb-4">Адміністрування</p>
          {isModerator && <AccountNavLink to="/moderator">Модератор</AccountNavLink>}
          {isAdmin && (
            <>
              <AccountNavLink to="/admin">Аналітика</AccountNavLink>
              <AccountNavLink to="/downloads?app=web-prod-2026">Деплой</AccountNavLink>
            </>
          )}
          <p className="px-3 pt-3 text-xs text-muted-light">{me.login}</p>
          <button type="button" onClick={logout} className="mt-3 w-full rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50">
            Вийти
          </button>
        </aside>
        <div>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}
