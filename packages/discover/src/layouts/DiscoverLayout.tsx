import { Link, NavLink, Outlet, Navigate } from 'react-router-dom'
import { useBootstrapAuth, useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import ErrorBoundary from '@gaido/ui-primitives/ErrorBoundary'
import DiscoverHeader from '../components/DiscoverHeader'
import DiscoverFooter from '../components/DiscoverFooter'
import CookieBanner from '../components/CookieBanner'
import { useTelegramBotURL } from '../hooks/useTelegramBotURL'
import { LocationProvider } from '../contexts/LocationContext'

function AccountNavLink({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-sand-100 font-medium text-ink' : 'text-ink hover:bg-sand-100'}`
      }
    >
      {children}
    </NavLink>
  )
}

export function DiscoverPublicLayout() {
  useTelegramBotURL()
  return (
    <LocationProvider>
      <div className="flex min-h-screen flex-col bg-page">
        <DiscoverHeader />
        <main className="flex-1">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <DiscoverFooter />
        <CookieBanner />
      </div>
    </LocationProvider>
  )
}

export function DiscoverAccountLayout() {
  const logout = useLogout()
  const { isLoading: authLoading } = useBootstrapAuth()
  const { data: me, isLoading, isError } = useMe()
  const isAdmin = useHasRole('ROLE_ADMIN')
  const isModerator = useHasRole('ROLE_MODERATOR')

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
    <LocationProvider>
      <div className="min-h-screen bg-page">
        <DiscoverHeader />
        <div className="container-site grid gap-6 py-8 md:grid-cols-[240px_1fr]">
          <aside className="card h-fit space-y-1 p-4">
            <Link to="/" className="mb-3 block font-display text-lg font-medium text-ink transition hover:opacity-75">
              ← На головну
            </Link>
            <p className="section-title-sm mb-4">Кабінет</p>
            <AccountNavLink to="/account" end>Огляд</AccountNavLink>
            <AccountNavLink to="/account/favorites">Обране</AccountNavLink>
            <AccountNavLink to="/account/settings">Налаштування</AccountNavLink>
            <AccountNavLink to="/account/provider">Кабінет постачальника</AccountNavLink>
            {(isAdmin || isModerator) && (
              <>
                {isModerator && <AccountNavLink to="/moderator">Модератор</AccountNavLink>}
                {isAdmin && (
                  <>
                    <AccountNavLink to="/admin">Адмін</AccountNavLink>
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
    </LocationProvider>
  )
}

export function DiscoverAdminLayout() {
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
      <div className="flex min-h-screen flex-col bg-page">
        <DiscoverHeader />
        <div className="container-site py-12">
          <div className="card space-y-2">
            <h1 className="font-display text-xl font-bold">Доступ заборонено</h1>
            <p className="text-sm text-muted">Ця сторінка доступна лише адміністраторам.</p>
            <Link to="/" className="link-accent text-sm">На головну</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-ui min-h-screen bg-page">
      <DiscoverHeader />
      <div className="container-site grid gap-6 py-8 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit space-y-1 p-4">
          <Link to="/" className="mb-3 block font-display text-lg font-medium text-ink transition hover:opacity-75">
            ← На головну Servis
          </Link>
          {isModerator && <AccountNavLink to="/moderator">Модератор</AccountNavLink>}
          {isAdmin && (
            <>
              <AccountNavLink to="/admin">Адмін</AccountNavLink>
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
      <CookieBanner />
    </div>
  )
}

export { LocationProvider }
