import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { formatApiError, setAccessToken } from '../api/http'
import { pageTitle } from '../lib/brand'

function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const from = (location.state as { from?: string } | null)?.from

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.login({ login, password })
      setAccessToken(res.access_token)
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate(safeReturnPath(from))
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  return (
    <>
      <Helmet><title>{pageTitle('Вхід')}</title></Helmet>
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <form onSubmit={submit} className="card space-y-4">
          <input className="input" placeholder="Логін" value={login} onChange={(e) => setLogin(e.target.value)} />
          <input className="input" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-accent w-full">Увійти</button>
        </form>
      </div>
    </>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ email: '', login: '', password: '', as_guide: false })
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.register(form)
      setAccessToken(res.access_token)
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate(form.as_guide ? '/account/guide' : '/account')
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  return (
    <>
      <Helmet><title>{pageTitle('Реєстрація')}</title></Helmet>
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-6">Реєстрація</h1>
        <form onSubmit={submit} className="card space-y-4">
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Логін" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
          <input className="input" type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.as_guide} onChange={(e) => setForm({ ...form, as_guide: e.target.checked })} />
            Зареєструватися як гід
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-accent w-full">Створити акаунт</button>
        </form>
      </div>
    </>
  )
}
