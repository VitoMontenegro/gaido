import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '@gaido/api-client/hooks/useAuth'

export function RoleGate({ role, children }: { role: string; children: ReactNode }) {
  const { data: me, isLoading, isError } = useMe()

  if (isLoading) {
    return <div className="card text-stone-600">Завантаження…</div>
  }

  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }

  if (!me.roles.includes(role) && !(role === 'ROLE_MODERATOR' && me.roles.includes('ROLE_ADMIN'))) {
    return (
      <div className="card space-y-2">
        <h1 className="font-display text-xl font-bold">Доступ заборонено</h1>
        <p className="text-sm text-stone-600">Потрібна роль {role}. Ви увійшли як {me.login}.</p>
      </div>
    )
  }

  return <>{children}</>
}

export function GuideRoleGate({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError } = useMe()
  const location = useLocation()

  if (isLoading) {
    return <div className="card text-stone-600">Завантаження…</div>
  }

  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!me.roles.includes('ROLE_GUIDE')) {
    return <Navigate to="/account/guide/profile" replace state={{ next: location.pathname }} />
  }

  return <>{children}</>
}
