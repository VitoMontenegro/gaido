const API_BASE = import.meta.env.VITE_API_URL ?? ''

export type ApiError = {
  error: { code: string; message: string; request_id: string }
}

export class ApiClientError extends Error {
  code: string
  requestId?: string

  constructor(code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.requestId = requestId
  }
}

const API_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Увійдіть в акаунт, щоб виконати цю дію',
  FORBIDDEN: 'Недостатньо прав для цієї дії',
  NOT_FOUND: 'Запитаний ресурс не знайдено',
  VALIDATION: 'Перевірте правильність введених даних',
  VALIDATION_ERROR: 'Перевірте правильність введених даних',
  CONFLICT: 'Такий запис уже існує',
  EMAIL_ALREADY_EXISTS: 'Користувач з таким email вже існує',
  LOGIN_ALREADY_EXISTS: 'Такий логін уже зайнятий',
  REVIEW_ALREADY_EXISTS: 'Ви вже залишили відгук на цю екскурсію',
  RATE_LIMITED: 'Забагато спроб. Спробуйте пізніше',
}

export type ApiErrorHints = Partial<Record<string, string>>

const VALIDATION_MESSAGE_UA: Record<string, string> = {
  'email is required': 'Вкажіть email',
  'invalid email format': 'Невірний формат email',
  'login is required': 'Вкажіть логін',
  'login must be 3-32 latin letters, digits, _, . or -':
    'Логін: лише латиниця, цифри та символи _ . - (від 3 до 32 символів)',
  'password must be at least 8 characters': 'Пароль — мінімум 8 символів',
  'invalid JSON body': 'Невірний формат запиту',
  'first_name is required': 'Вкажіть імʼя',
  'last_name is required': 'Вкажіть прізвище',
  'privacy policy must be accepted': 'Потрібна згода з політикою конфіденційності',
  'site rules must be accepted': 'Потрібна згода з правилами сайту',
  'placement rules must be accepted': 'Потрібна згода з правилами розміщення',
}

export function formatApiError(error: unknown, hints?: string | ApiErrorHints): string {
  if (error instanceof ApiClientError) {
    if (typeof hints === 'string' && error.code === 'UNAUTHORIZED') return hints
    if (hints && typeof hints === 'object' && hints[error.code]) return hints[error.code]!
    if (error.code === 'VALIDATION_ERROR' && error.message && error.message !== 'Validation failed') {
      return VALIDATION_MESSAGE_UA[error.message] ?? error.message
    }
    if (API_ERROR_MESSAGES[error.code]) return API_ERROR_MESSAGES[error.code]!
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'Сталася помилка. Спробуйте ще раз.'
}

export function getApiErrorCode(error: unknown): string | undefined {
  return error instanceof ApiClientError ? error.code : undefined
}

let accessToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

/** @deprecated use getAccessToken — token is kept in memory only */
export function loadAccessToken() {
  return accessToken
}

export function getApiBase() {
  return API_BASE
}

async function parseApiError(res: Response): Promise<ApiClientError> {
  const err = (await res.json().catch(() => null)) as ApiError | null
  const code = err?.error?.code ?? 'UNKNOWN'
  const message = err?.error?.message ?? res.statusText
  return new ApiClientError(code, message, err?.error?.request_id)
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        setAccessToken(null)
        return false
      }
      const data = (await res.json()) as { access_token: string }
      setAccessToken(data.access_token)
      return true
    } catch {
      setAccessToken(null)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/** Restore session from HttpOnly refresh cookie on page load. */
export async function bootstrapAuth(): Promise<boolean> {
  return refreshAccessToken()
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })

  let res = await doFetch()

  if (res.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login') && !path.includes('/auth/register')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
      else headers.delete('Authorization')
      res = await doFetch()
    }
  }

  if (!res.ok) throw await parseApiError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Повний URL зображення: зовнішній URL, шлях або public_key з медіа-сховища */
export function resolveMediaUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url
  const base = API_BASE.replace(/\/$/, '')
  return `${base}/api/v1/media/public/${url}`
}
