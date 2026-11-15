import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@gaido/api-client/api/http'
import ForgotPasswordForm from '@gaido/ui-primitives/ForgotPasswordForm'
import ResetPasswordForm from '@gaido/ui-primitives/ResetPasswordForm'
import { LoginForm, RegisterForm } from '@gaido/ui-primitives/AuthForms'
import { pageTitle } from '@gaido/site-urls/brand'
import { servicesPostLoginUrl } from '@gaido/site-urls/site'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return (
    <>
      <Helmet><title>{pageTitle('Вхід')}</title></Helmet>
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <LoginForm
          onSuccess={(_token, roles) => {
            const fromPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : undefined
            navigate(servicesPostLoginUrl(fromPath, roles))
          }}
        />
        <p className="mt-3 text-center text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Забули пароль?</Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted">
          Немає акаунта?{' '}
          <Link to="/register" className="text-brand-700 hover:underline">Реєстрація</Link>
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
        <h1 className="section-title-sm mb-2">Реєстрація</h1>
        <p className="mb-6 text-sm text-muted">Створіть акаунт, щоб зберігати обране та залишати відгуки.</p>
        <RegisterForm />
      </div>
    </>
  )
}

export function RegisterGuidePage() {
  return <RegisterTouristPage />
}

export function RegisterPage() {
  return <RegisterTouristPage />
}

export function ForgotPasswordPage() {
  return (
    <>
      <Helmet><title>{pageTitle('Відновлення пароля')}</title></Helmet>
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
      <Helmet><title>{pageTitle('Новий пароль')}</title></Helmet>
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
