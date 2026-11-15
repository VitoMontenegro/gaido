import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@gaido/api-client/api/http'
import ForgotPasswordForm from '@gaido/ui-primitives/ForgotPasswordForm'
import ResetPasswordForm from '@gaido/ui-primitives/ResetPasswordForm'
import { LoginForm, RegisterForm } from '@gaido/ui-primitives/AuthForms'
import { pageTitle } from '@gaido/site-urls/brand'
import { transportPostLoginUrl } from '@gaido/site-urls/site'
import { Seo } from '../lib/seo'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const fromPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : undefined
  return (
    <>
      <Seo title={pageTitle('Вхід')} path="/login" noIndex />
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <LoginForm onSuccess={(_token, roles) => navigate(transportPostLoginUrl(fromPath, roles))} />
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
        <RegisterForm />
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
        <p className="mb-6 text-sm text-muted">Після реєстрації заповніть профіль перевізника — тоді можна буде додати рейс.</p>
        <RegisterForm />
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
