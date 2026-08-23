import { Link, NavLink, Outlet, Navigate } from 'react-router-dom'
import { useBootstrapAuth, useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import TransportHeader from '../components/TransportHeader'
import TransportFooter from '../components/TransportFooter'
import CookieBanner from '../components/CookieBanner'
import ErrorBoundary from '@gaido/ui-primitives/ErrorBoundary'

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

export function TransportAccountLayout() {
  const logout = useLogout()
  const { isLoading: authLoading } = useBootstrapAuth()
  const { data: me, isLoading, isError } = useMe()
  const isAdmin = useHasRole('ROLE_ADMIN')
  const isModerator = useHasRole('ROLE_MODERATOR')
  const isProvider = useHasRole('ROLE_PROVIDER')

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

  if (isAdmin || isModerator) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TransportHeader />
      <main className="flex-1">
        <ErrorBoundary>
          <div className="container-site grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
            <aside className="card h-fit space-y-1 p-3">
              <p className="px-3 py-2 text-sm font-medium text-ink">{me.first_name} {me.last_name}</p>
              <AccountNavLink to="/account/bookings">Мої бронювання</AccountNavLink>
              {isProvider && (
                <>
                  <AccountNavLink to="/account/carrier">Профіль перевізника</AccountNavLink>
                  <AccountNavLink to="/account/carrier/billing">Підписка Vezu</AccountNavLink>
                  <AccountNavLink to="/account/rides" end>Мої рейси</AccountNavLink>
                  <AccountNavLink to="/account/rides/new">Додати рейс</AccountNavLink>
                </>
              )}
              <Link to="/" className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-sand-100">
                Пошук рейсів
              </Link>
              <button type="button" className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-sand-100" onClick={() => logout()}>
                Вийти
              </button>
            </aside>
            <div>
              <Outlet />
            </div>
          </div>
        </ErrorBoundary>
      </main>
      <TransportFooter />
      <CookieBanner />
    </div>
  )
}
