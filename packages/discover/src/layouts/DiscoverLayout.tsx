import { Link, NavLink, Outlet, Navigate } from 'react-router-dom'
import { useBootstrapAuth, useMe } from '@gaido/api-client/hooks/useAuth'
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

export { LocationProvider }
