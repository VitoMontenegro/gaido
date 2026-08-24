import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '@gaido/api-client/api/auth'
import { formatApiError } from '@gaido/api-client/api/http'
import PasswordInput from './PasswordInput'

export default function ResetPasswordForm({ onSuccess }: { onSuccess: (accessToken: string) => void }) {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!token) {
    return (
      <div className="card space-y-3">
        <p className="text-sm text-red-600">Посилання недійсне або прострочене.</p>
        <Link to="/forgot-password" className="text-sm text-brand-700 hover:underline">
          Запросити нове посилання
        </Link>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Пароль — мінімум 8 символів')
      return
    }
    if (password !== passwordConfirm) {
      setError('Паролі не збігаються')
      return
    }
    setError('')
    setPending(true)
    try {
      const res = await authApi.resetPassword({ token, password })
      onSuccess(res.access_token)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <PasswordInput
        autoComplete="new-password"
        placeholder="Новий пароль (мін. 8 символів)"
        value={password}
        onChange={setPassword}
      />
      <PasswordInput
        autoComplete="off"
        placeholder="Повторіть пароль"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-accent w-full" disabled={pending}>
        Зберегти пароль
      </button>
    </form>
  )
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError('Пароль — мінімум 8 символів')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Паролі не збігаються')
      return
    }
    if (newPassword === currentPassword) {
      setError('Новий пароль має відрізнятися від поточного')
      return
    }
    setError('')
    setSaved(false)
    setPending(true)
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Пароль</h2>
        <p className="mt-2 text-stone-600">Змініть пароль, щоб захистити акаунт.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Поточний пароль</span>
        <PasswordInput
          autoComplete="current-password"
          value={currentPassword}
          onChange={(v) => { setCurrentPassword(v); setSaved(false) }}
          disabled={pending}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Новий пароль</span>
        <PasswordInput
          autoComplete="new-password"
          placeholder="Мінімум 8 символів"
          value={newPassword}
          onChange={(v) => { setNewPassword(v); setSaved(false) }}
          disabled={pending}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Повторіть новий пароль</span>
        <PasswordInput
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(v) => { setConfirmPassword(v); setSaved(false) }}
          disabled={pending}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Пароль змінено.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Збереження…' : 'Змінити пароль'}
      </button>
    </form>
  )
}

export function loginConfirmMessage(flag: string | null): string {
  if (flag === 'invalid') return 'Посилання підтвердження недійсне або прострочене'
  if (flag === 'exists') return 'Цей акаунт уже підтверджено. Увійдіть.'
  return ''
}
