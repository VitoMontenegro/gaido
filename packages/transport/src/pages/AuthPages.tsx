import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@gaido/api-client/api/auth'
import { formatApiError, setAccessToken } from '@gaido/api-client/api/http'
import { validateRegisterForm, type RegisterFormData } from '@gaido/ui-primitives/authValidation'
import CheckEmailNotice from '@gaido/ui-primitives/CheckEmailNotice'
import ForgotPasswordForm from '@gaido/ui-primitives/ForgotPasswordForm'
import ResetPasswordForm, { loginConfirmMessage } from '@gaido/ui-primitives/ResetPasswordForm'
import { legalPath } from '@gaido/ui-primitives/legalPaths'
import PasswordInput from '@gaido/ui-primitives/PasswordInput'
import { pageTitle } from '@gaido/site-urls/brand'
import { transportPostLoginUrl } from '@gaido/site-urls/site'
import { Seo } from '../lib/seo'

function safeReturnPath(from: unknown): string | undefined {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : undefined
}

const emptyRegisterForm = (): RegisterFormData => ({
  email: '',
  login: '',
  password: '',
  password_confirm: '',
  first_name: '',
  last_name: '',
  accept_privacy: false,
  accept_site_rules: false,
  accept_placement_rules: false,
})

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-2 text-sm leading-snug">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

function RegisterForm({ mode }: { mode: 'tourist' | 'driver' }) {
  const [form, setForm] = useState<RegisterFormData>(emptyRegisterForm)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const isDriver = mode === 'driver'
  const canSubmit = validateRegisterForm(form, 'tourist') === null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateRegisterForm(form, 'tourist')
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      const res = await authApi.register({
        email: form.email.trim(),
        login: form.login.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        as_guide: false,
        accept_privacy: form.accept_privacy,
        accept_site_rules: form.accept_site_rules,
        accept_placement_rules: false,
        return_origin: window.location.origin,
      })
      setPendingEmail(res.email)
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (pendingEmail) return <CheckEmailNotice email={pendingEmail} />

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input className="input" autoComplete="given-name" placeholder="Імʼя" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input className="input" autoComplete="family-name" placeholder="Прізвище" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
      </div>
      <input className="input" type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="input" autoComplete="off" placeholder="Логін (латиниця)" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
      <PasswordInput autoComplete="new-password" placeholder="Пароль (мін. 8 символів)" value={form.password} onChange={(password) => setForm({ ...form, password })} />
      <PasswordInput autoComplete="off" placeholder="Повторіть пароль" value={form.password_confirm} onChange={(password_confirm) => setForm({ ...form, password_confirm })} />
      <div className="space-y-3 border-t border-divider pt-4">
        <ConsentCheckbox checked={form.accept_privacy} onChange={(accept_privacy) => setForm({ ...form, accept_privacy })}>
          Ознайомлений(-на) з{' '}
          <Link to={legalPath('privacy')} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
            політикою конфіденційності
          </Link>
        </ConsentCheckbox>
        <ConsentCheckbox checked={form.accept_site_rules} onChange={(accept_site_rules) => setForm({ ...form, accept_site_rules })}>
          Ознайомлений(-на) з{' '}
          <Link to={legalPath('site-rules')} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
            правилами сайту
          </Link>
        </ConsentCheckbox>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-accent w-full" disabled={!canSubmit}>
        {isDriver ? 'Зареєструватися як водій' : 'Створити акаунт'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const from = (location.state as { from?: string } | null)?.from
  const confirmHint = loginConfirmMessage(new URLSearchParams(location.search).get('confirm'))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.login({ login: login.trim(), password })
      setAccessToken(res.access_token)
      const me = await authApi.me()
      await qc.setQueryData(['me'], me)
      navigate(transportPostLoginUrl(safeReturnPath(from), me.roles))
    } catch (err) {
      setError(formatApiError(err, {
        UNAUTHORIZED: 'Невірний логін або пароль',
        INVALID_CREDENTIALS: 'Невірний логін або пароль',
      }))
    }
  }

  return (
    <>
      <Seo title={pageTitle('Вхід')} path="/login" noIndex />
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <form onSubmit={submit} className="card space-y-4" autoComplete="off">
          <input className="input" placeholder="Логін або email" value={login} onChange={(e) => setLogin(e.target.value)} />
          <PasswordInput autoComplete="current-password" placeholder="Пароль" value={password} onChange={setPassword} />
          {confirmHint && <p className="text-sm text-red-600">{confirmHint}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-accent w-full">Увійти</button>
        </form>
        <p className="mt-3 text-center text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Забули пароль?</Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted">
          Немає акаунта? <Link to="/register" className="text-brand-700 hover:underline">Реєстрація</Link>
          {' · '}
          <Link to="/register/driver" className="text-brand-700 hover:underline">Я водій</Link>
        </p>
      </div>
    </>
  )
}

export function RegisterTouristPage() {
  return (
    <>
      <Seo title={pageTitle('Реєстрація')} path="/register" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація</h1>
        <p className="mb-6 text-sm text-muted">Створіть акаунт, щоб бачити контакти для бронювання рейсів.</p>
        <RegisterForm mode="tourist" />
        <p className="mt-4 text-center text-sm text-muted">
          Перевозите пасажирів? <Link to="/register/driver" className="text-brand-700 hover:underline">Реєстрація водія</Link>
        </p>
      </div>
    </>
  )
}

export function RegisterDriverPage() {
  return (
    <>
      <Seo title={pageTitle('Реєстрація водія')} path="/register/driver" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація водія / перевізника</h1>
        <p className="mb-6 text-sm text-muted">
          Після реєстрації заповніть профіль перевізника — тоді можна буде додати рейс.
        </p>
        <RegisterForm mode="driver" />
        <p className="mt-4 text-center text-sm text-muted">
          Шукаєте поїздку? <Link to="/register" className="text-brand-700 hover:underline">Реєстрація пасажира</Link>
        </p>
      </div>
    </>
  )
}

export function ForgotPasswordPage() {
  return (
    <>
      <Seo title={pageTitle('Відновлення пароля')} path="/forgot-password" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-6">Відновлення пароля</h1>
        <ForgotPasswordForm />
      </div>
    </>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (
    <>
      <Seo title={pageTitle('Новий пароль')} path="/reset-password" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-6">Новий пароль</h1>
        <ResetPasswordForm
          onSuccess={async (token) => {
            setAccessToken(token)
            await qc.invalidateQueries({ queryKey: ['me'] })
            navigate('/')
          }}
        />
      </div>
    </>
  )
}
