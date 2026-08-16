import { Link, useLocation } from 'react-router-dom'
import { formatApiError, getApiErrorCode, type ApiErrorHints } from '@gaido/api-client/api/client'

type Props = {
  error: unknown
  hint?: string | ApiErrorHints
  className?: string
}

export default function ApiErrorBanner({ error, hint, className = '' }: Props) {
  const location = useLocation()
  if (!error) return null

  const code = getApiErrorCode(error)
  const message = formatApiError(error, hint)

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`} role="alert">
      <p>{message}</p>
      {code === 'UNAUTHORIZED' && (
        <p className="mt-1">
          <Link to="/login" state={{ from: location.pathname }} className="font-medium underline hover:text-red-900">
            Увійти в акаунт
          </Link>
        </p>
      )}
    </div>
  )
}
