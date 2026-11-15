import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@gaido/api-client/api/auth'
import { formatApiError, setAccessToken } from '@gaido/api-client/api/http'
import { validateRegisterForm, validateOAuthConsents, type RegisterFormData } from './authValidation'
import CheckEmailNotice from './CheckEmailNotice'
import { legalPath } from './legalPaths'
import PasswordInput from './PasswordInput'
import OAuthButtons from './OAuthButtons'
import { authReturnOrigin } from '@gaido/site-urls/site'
import { loginConfirmMessage } from './ResetPasswordForm'

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

const emptyRegisterForm = (): RegisterFormData => ({
  email: '',
  password: '',
  password_confirm: '',
  first_name: '',
  last_name: '',
  accept_privacy: false,
  accept_site_rules: false,
})

export function RegisterForm() {
  const [form, setForm] = useState<RegisterFormData>(emptyRegisterForm)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const canSubmit = validateRegisterForm(form) === null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateRegisterForm(form)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      const res = await authApi.register({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        accept_privacy: form.accept_privacy,
        accept_site_rules: form.accept_site_rules,
        return_origin: authReturnOrigin(),
      })
      setPendingEmail(res.email)
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (pendingEmail) return <CheckEmailNotice email={pendingEmail} />

  return (
    <form onSubmit={submit} className="card space-y-4">
      <OAuthButtons acceptPrivacy={form.accept_privacy} acceptSiteRules={form.accept_site_rules} disabled={!form.accept_privacy || !form.accept_site_rules} />
      <div className="grid gap-4 sm:grid-cols-2">
        <input className="input" autoComplete="given-name" placeholder="Імʼя" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input className="input" autoComplete="family-name" placeholder="Прізвище" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
      </div>
      <input className="input" type="email" name="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <PasswordInput name="password" autoComplete="new-password" placeholder="Пароль (мін. 8 символів)" value={form.password} onChange={(password) => setForm({ ...form, password })} />
      <PasswordInput name="password_confirm" autoComplete="off" placeholder="Повторіть пароль" value={form.password_confirm} onChange={(password_confirm) => setForm({ ...form, password_confirm })} />
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
        Створити акаунт
      </button>
    </form>
  )
}

function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account'
}

export function LoginForm({ onSuccess }: { onSuccess?: (token: string, roles: string[]) => void } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [site, setSite] = useState(false)
  const [oauthEmail, setOauthEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const from = (location.state as { from?: string } | null)?.from
  const params = new URLSearchParams(location.search)
  const confirmHint = loginConfirmMessage(params.get('confirm'))
  const oauthHint = params.get('oauth')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await authApi.login({ login: login.trim(), password })
      setAccessToken(res.access_token)
      await qc.prefetchQuery({ queryKey: ['me'], queryFn: authApi.me })
      if (onSuccess) onSuccess(res.access_token, res.roles ?? [])
      else navigate(safeReturnPath(from))
    } catch (err) {
      setError(formatApiError(err, {
        UNAUTHORIZED: 'Невірний логін або пароль',
        INVALID_CREDENTIALS: 'Невірний логін або пароль',
        RATE_LIMITED: 'Забагато невдалих спроб. Спробуйте пізніше',
      }))
    }
  }

  const sendOAuthEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateOAuthConsents(privacy, site)
    if (err) {
      setError(err)
      return
    }
    try {
      const res = await authApi.completeOAuthEmail({ email: oauthEmail.trim(), return_origin: authReturnOrigin() })
      setPendingEmail(res.email)
    } catch (e) {
      setError(formatApiError(e))
    }
  }

  if (pendingEmail) return <CheckEmailNotice email={pendingEmail} />

  return (
    <div className="card space-y-4">
      {oauthHint === 'email' && (
        <form onSubmit={sendOAuthEmail} className="space-y-3 rounded-xl bg-sand-50 p-3">
          <p className="text-sm">Підтвердіть email, щоб завершити реєстрацію.</p>
          <input className="input" type="email" required placeholder="Email" value={oauthEmail} onChange={(e) => setOauthEmail(e.target.value)} />
          <ConsentCheckbox checked={privacy} onChange={setPrivacy}>
            Політика конфіденційності
          </ConsentCheckbox>
          <ConsentCheckbox checked={site} onChange={setSite}>
            Правила сайту
          </ConsentCheckbox>
          <button type="submit" className="btn-accent w-full">Надіслати лист</button>
        </form>
      )}
      {oauthHint === 'cancelled' && <p className="text-sm text-stone-600">Вхід скасовано. Можна спробувати ще раз або увійти з email.</p>}
      {oauthHint === 'link' && <p className="text-sm text-stone-600">Цей email уже є в Gaido. Увійдіть з паролем, потім підключіть Google або Facebook у налаштуваннях.</p>}
      <div className="space-y-3">
        <ConsentCheckbox checked={privacy} onChange={setPrivacy}>
          Ознайомлений(-на) з політикою конфіденційності
        </ConsentCheckbox>
        <ConsentCheckbox checked={site} onChange={setSite}>
          Ознайомлений(-на) з правилами сайту
        </ConsentCheckbox>
      </div>
      <OAuthButtons acceptPrivacy={privacy} acceptSiteRules={site} disabled={!privacy || !site} />
      <form onSubmit={submit} className="space-y-4" autoComplete="off">
        <input className="input" name="login" autoComplete="off" placeholder="Логін або email" value={login} onChange={(e) => setLogin(e.target.value)} />
        <PasswordInput name="password" autoComplete="current-password" placeholder="Пароль" value={password} onChange={setPassword} />
        {confirmHint && <p className="text-sm text-red-600">{confirmHint}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-accent w-full">Увійти</button>
      </form>
    </div>
  )
}

export function IdentitiesCard() {
  const qc = useQueryClient()
  const [privacy, setPrivacy] = useState(true)
  const [site, setSite] = useState(true)
  const [error, setError] = useState('')
  const list = useQuery({ queryKey: ['account-identities'], queryFn: authApi.identities })

  const unlink = async (provider: string) => {
    setError('')
    try {
      await authApi.unlinkIdentity(provider)
      await qc.invalidateQueries({ queryKey: ['account-identities'] })
    } catch (e) {
      setError(formatApiError(e))
    }
  }

  const connected = new Set((list.data?.items ?? []).map((i) => i.provider))

  return (
    <div className="card space-y-3">
      <h2 className="font-display text-lg font-bold">Способи входу</h2>
      <p className="text-sm text-stone-600">Google і Facebook можна підключити після повторного підтвердження.</p>
      {connected.has('google') ? (
        <button type="button" className="btn-secondary" onClick={() => unlink('google')}>Відключити Google</button>
      ) : null}
      {connected.has('facebook') ? (
        <button type="button" className="btn-secondary" onClick={() => unlink('facebook')}>Відключити Facebook</button>
      ) : null}
      <OAuthButtons acceptPrivacy={privacy} acceptSiteRules={site} intent="link" />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
