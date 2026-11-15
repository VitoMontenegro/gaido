import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { getAccessToken, setAccessToken } from '@gaido/api-client/api/http'
import ForgotPasswordForm from '@gaido/ui-primitives/ForgotPasswordForm'
import ResetPasswordForm from '@gaido/ui-primitives/ResetPasswordForm'
import { LoginForm, RegisterForm } from '@gaido/ui-primitives/AuthForms'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../lib/seo'

export default function LoginPage() {
  return (
    <>
      <Seo title={pageTitle('Вхід')} path="/login" noIndex />
      <div className="container-site flex min-h-[60vh] max-w-md flex-col justify-center py-12">
        <h1 className="section-title-sm mb-6">Вхід</h1>
        <LoginForm />
        <p className="mt-3 text-center text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Забули пароль?</Link>
        </p>
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
      <Seo title={pageTitle('Реєстрація')} path="/register" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація мандрівника</h1>
        <p className="mb-6 text-sm text-muted">Створіть акаунт, щоб синхронізувати обране на всіх пристроях і залишати відгуки.</p>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-muted">
          Хочете проводити екскурсії?{' '}
          <Link to="/register/guide" className="text-brand-700 hover:underline">Реєстрація гіда</Link>
        </p>
      </div>
    </>
  )
}

export function RegisterGuidePage() {
  const { data: me, isLoading } = useMe()

  if (getAccessToken() && isLoading) {
    return <div className="container-site max-w-md py-12 text-muted">Завантаження…</div>
  }

  if (me) {
    return <Navigate to={me.roles.includes('ROLE_GUIDE') ? '/account/guide' : '/account/guide/profile'} replace />
  }

  return (
    <>
      <Seo title={pageTitle('Реєстрація гіда')} path="/register/guide" noIndex />
      <div className="container-site max-w-md py-12">
        <h1 className="section-title-sm mb-2">Реєстрація гіда</h1>
        <p className="mb-6 text-sm text-muted">Спочатку створіть акаунт мандрівника. Профіль гіда заповнюється після входу, без вибору адреси вручну.</p>
        <RegisterForm />
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
