import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@gaido/api-client/api/auth'
import { formatApiError } from '@gaido/api-client/api/http'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await authApi.forgotPassword({
        email: email.trim(),
        return_origin: window.location.origin,
      })
      setSent(true)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="card space-y-3">
        <p className="font-semibold">Перевірте пошту</p>
        <p className="text-sm text-muted">
          Якщо акаунт з такою адресою існує, ми надіслали посилання для зміни пароля.
        </p>
        <Link to="/login" className="text-sm text-brand-700 hover:underline">
          Повернутися до входу
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <p className="text-sm text-muted">Вкажіть email акаунта — надішлемо посилання для нового пароля.</p>
      <input
        className="input"
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-accent w-full" disabled={pending}>
        Надіслати посилання
      </button>
    </form>
  )
}
