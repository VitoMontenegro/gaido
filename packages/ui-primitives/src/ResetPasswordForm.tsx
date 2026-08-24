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

export function loginConfirmMessage(flag: string | null): string {
  if (flag === 'invalid') return 'Посилання підтвердження недійсне або прострочене'
  if (flag === 'exists') return 'Цей акаунт уже підтверджено. Увійдіть.'
  return ''
}
