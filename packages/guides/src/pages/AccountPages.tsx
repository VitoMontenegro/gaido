import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { authApi, userDisplayName } from '@gaido/api-client/api/client'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { useHasRole, useMe } from '@gaido/api-client/hooks/useAuth'
import NotificationsPanel from '../components/NotificationsPanel'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function AccountPage() {
  const { data: me } = useMe()
  const isGuide = useHasRole('ROLE_GUIDE')
  const isAdmin = useHasRole('ROLE_ADMIN')

  if (isGuide) {
    return <Navigate to="/account/guide" replace />
  }

  const name = me ? userDisplayName(me) : 'гість'

  return (
    <>
      <Seo title={pageTitle('Особистий кабінет')} path="/account" noIndex />
      <div className="space-y-5">
        <div className="card">
          <h1 className="font-display text-2xl font-bold">Привіт, {name}!</h1>
          <p className="mt-2 text-stone-600">Особисті дані та доступ до робочих розділів.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <Link to="/admin" className="btn-primary">Аналітика платформи</Link>
                <Link to="/downloads?app=web-prod-2026" className="btn-secondary">Деплой</Link>
              </>
            )}
            <Link to="/account/settings" className="btn-secondary">Налаштування профілю</Link>
            {!isAdmin && (
              <>
                <Link to="/register" className="btn-accent text-sm">
                  Реєстрація
                </Link>
                <Link to="/register/guide" className="btn-ghost text-sm">
                  Стати гідом
                </Link>
              </>
            )}
          </div>
        </div>

        <NotificationsPanel />
      </div>
    </>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!me) return
    setFirstName(me.first_name ?? '')
    setLastName(me.last_name ?? '')
  }, [me])

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data)
      setSaved(true)
    },
  })

  return (
    <div className="card max-w-lg space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Налаштування</h1>
        <p className="mt-2 text-stone-600">Ім&apos;я та прізвище відображаються у ваших відгуках.</p>
      </div>
      <ApiErrorBanner error={mutation.error} className="mt-2" />
      {saved && !mutation.error && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Профіль збережено.
        </p>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Ім&apos;я</span>
        <input
          className="input"
          value={firstName}
          onChange={(e) => { setFirstName(e.target.value); setSaved(false) }}
          placeholder="Олена"
          disabled={mutation.isPending}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Прізвище</span>
        <input
          className="input"
          value={lastName}
          onChange={(e) => { setLastName(e.target.value); setSaved(false) }}
          placeholder="Коваленко"
          disabled={mutation.isPending}
        />
      </label>
      <p className="text-sm text-stone-500">Логін: {me?.login ?? '—'} · Email: {me?.email ?? '—'}</p>
      <button
        type="button"
        className="btn-primary"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  )
}
