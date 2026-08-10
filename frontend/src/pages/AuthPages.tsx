import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { formatApiError, setAccessToken } from '../api/http'
import { validateRegisterForm, type RegisterFormData } from '../lib/authValidation'
import { legalPath } from '../components/LegalContentEditor'
import PasswordInput from '../components/PasswordInput'
import { pageTitle } from '../lib/brand'

function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account'
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
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}

function RegisterForm({ mode }: { mode: 'tourist' | 'guide' }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<RegisterFormData>(emptyRegisterForm)
  const [error, setError] = useState('')
  const isGuide = mode === 'guide'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateRegisterForm(form, mode)
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
        as_guide: isGuide,
        accept_privacy: form.accept_privacy,
        accept_site_rules: form.accept_site_rules,
        accept_placement_rules: form.accept_placement_rules,
      })
      setAccessToken(res.access_token)
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate(isGuide ? '/account/guide' : '/account')
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          className="input"
          autoComplete="given-name"
          placeholder="Імʼя"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        />
        <input
          className="input"
          autoComplete="family-name"
          placeholder="Прізвище"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        />
      </div>
      <input
        className="input"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        className="input"
        name="login"
        autoComplete="off"
        placeholder="Логін (латиниця, напр. ivan_petrov)"
        value={form.login}
        onChange={(e) => setForm({ ...form, login: e.target.value })}
      />
      <PasswordInput
        name="password"
        autoComplete="new-password"
        placeholder="Пароль (мін. 8 символів)"
        value={form.password}
        onChange={(password) => setForm({ ...form, password })}
      />
      <PasswordInput
        name="password_confirm"
        autoComplete="off"
        placeholder="Повторіть пароль"
        value={form.password_confirm}
        onChange={(password_confirm) => setForm({ ...form, password_confirm })}
      />

      <div className="space-y-3 border-t border-divider pt-4">
        <ConsentCheckbox
          checked={form.accept_privacy}
          onChange={(accept_privacy) => setForm({ ...form, accept_privacy })}
        >
          Ознайомлений(-на) з{' '}
          <Link to={legalPath('privacy')} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
            політикою конфіденційності
          </Link>
        </ConsentCheckbox>

        {isGuide ? (
          <ConsentCheckbox
            checked={form.accept_placement_rules}
            onChange={(accept_placement_rules) => setForm({ ...form, accept_placement_rules })}
          >
            Ознайомлений(-на) з{' '}
            <Link to={legalPath('placement-rules')} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
              правилами розміщення
            </Link>
          </ConsentCheckbox>
        ) : (
          <ConsentCheckbox
            checked={form.accept_site_rules}
            onChange={(accept_site_rules) => setForm({ ...form, accept_site_rules })}
          >
            Ознайомлений(-на) з{' '}
            <Link to={legalPath('site-rules')} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">
              правилами сайту
            </Link>
          </ConsentCheckbox>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-accent w-full">
        {isGuide ? 'Створити акаунт гіда' : 'Створити акаунт'}
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.login({ login: login.trim(), password })
      setAccessToken(res.access_token)
      await qc.prefetchQuery({ queryKey: ['me'], queryFn: authApi.me })
      navigate(safeReturnPath(from))
    } catch (err) {
      setError(formatApiError(err, {
        UNAUTHORIZED: 'Невірний логін або пароль',
        INVALID_CREDENTIALS: 'Невірний логін або пароль',
        RATE_LIMITED: 'Забагато невдалих спроб. Спробуйте пізніше',
      }))
    }
  }

  return (
    <>
      <Helmet><title>{pageTitle('Вхід')}</title></Helmet>
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <form onSubmit={submit} className="card space-y-4" autoComplete="off">
          <input
            className="input"
            name="login"
            autoComplete="off"
            placeholder="Логін або email"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input className="input" type="password" name="password" autoComplete="current-password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-accent w-full">Увійти</button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Немає акаунта?{' '}
          <Link to="/register" className="text-brand-700 hover:underline">Реєстрація</Link>
          {' · '}
          <Link to="/register/guide" className="text-brand-700 hover:underline">Стати гідом</Link>
        </p>
      </div>
    </>
  )
}

export function RegisterTouristPage() {
  return (
    <>
      <Helmet><title>{pageTitle('Реєстрація')}</title></Helmet>
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація мандрівника</h1>
        <p className="mb-6 text-sm text-muted">Створіть акаунт, щоб зберігати обране та залишати відгуки.</p>
        <RegisterForm mode="tourist" />
        <p className="mt-4 text-center text-sm text-muted">
          Хочете проводити екскурсії?{' '}
          <Link to="/register/guide" className="text-brand-700 hover:underline">Реєстрація гіда</Link>
        </p>
      </div>
    </>
  )
}

export function RegisterGuidePage() {
  return (
    <>
      <Helmet><title>{pageTitle('Реєстрація гіда')}</title></Helmet>
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація гіда</h1>
        <p className="mb-6 text-sm text-muted">Створіть профіль гіда та додайте свої екскурсії в каталог.</p>
        <RegisterForm mode="guide" />
        <p className="mt-4 text-center text-sm text-muted">
          Шукаєте екскурсію?{' '}
          <Link to="/register" className="text-brand-700 hover:underline">Реєстрація мандрівника</Link>
        </p>
      </div>
    </>
  )
}

/** @deprecated use RegisterTouristPage */
export function RegisterPage() {
  return <RegisterTouristPage />
}
