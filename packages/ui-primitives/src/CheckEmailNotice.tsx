import { useState } from 'react'
import { authApi } from '@gaido/api-client/api/auth'
import { formatApiError } from '@gaido/api-client/api/http'

export default function CheckEmailNotice({ email }: { email: string }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const resend = async () => {
    setError('')
    setMessage('')
    setPending(true)
    try {
      await authApi.resendRegister({
        email,
        return_origin: window.location.origin,
      })
      setMessage('Лист надіслано повторно')
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="card space-y-3">
      <p className="font-semibold">Перевірте пошту</p>
      <p className="text-sm text-muted">
        Ми надіслали лист на <span className="font-medium text-ink">{email}</span>. Відкрийте посилання, щоб
        завершити реєстрацію.
      </p>
      {message && <p className="text-sm text-teal">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" className="btn-ghost w-full" disabled={pending} onClick={resend}>
        Надіслати лист ще раз
      </button>
    </div>
  )
}
