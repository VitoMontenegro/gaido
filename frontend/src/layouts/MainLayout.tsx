import { Link, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi, loadAccessToken, setAccessToken, authApi } from '../api/client'
import { useHasRole, useMe } from '../hooks/useAuth'
import ErrorBoundary from '../components/ErrorBoundary'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import AccountNavLink from '../components/crm/AccountNavLink'

loadAccessToken()

export function PublicLayout() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  const logout = async () => {
    await authApi.logout()
    setAccessToken(null)
    qc.removeQueries({ queryKey: ['me'] })
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <SiteHeader onLogout={logout} />

      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <SiteFooter />
    </div>
  )
}

export function AccountLayout() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me, isLoading, isError } = useMe()
  const isGuide = useHasRole('ROLE_GUIDE')
  const isModerator = useHasRole('ROLE_MODERATOR')
  const isAdmin = useHasRole('ROLE_ADMIN')

  const logout = async () => {
    await authApi.logout()
    setAccessToken(null)
    qc.removeQueries({ queryKey: ['me'] })
    navigate('/')
  }

  if (isLoading) {
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
          <AccountNavLink to="/account" end>Огляд</AccountNavLink>
          {!isAdmin && (
            <AccountNavLink to="/account/favorites">Обране</AccountNavLink>
          )}
          <AccountNavLink to="/account/settings">Налаштування</AccountNavLink>
          {isGuide && (
            <AccountNavLink to="/account/guide">Кабінет гіда</AccountNavLink>
          )}
          {isModerator && (
            <AccountNavLink to="/moderator">Модератор</AccountNavLink>
          )}
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
        <div><Outlet /></div>
      </div>
    </div>
  )
}
