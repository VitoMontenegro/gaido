import { api } from './http'

export type MeImpersonation = {
  active: boolean
  actor_id: number
  actor_login: string
  guide_id: number
  display_name: string
}

export type MeUser = {
  id: number
  login: string
  email: string
  first_name: string
  last_name: string
  roles: string[]
  avatar_url?: string
  has_password?: boolean
  impersonation?: MeImpersonation
}

export function userDisplayName(me: Pick<MeUser, 'first_name' | 'last_name' | 'login'>): string {
  const name = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()
  return name || me.login
}

export type RegisterPending = {
  email: string
  expires_in: number
  dev_token?: string
}

export const authApi = {
  oauthProviders: () => api<{ google: boolean; facebook: boolean }>('/api/v1/auth/oauth/providers'),
  oauthStartUrl: (
    provider: 'google' | 'facebook',
    q: { return_origin?: string; accept_privacy: boolean; accept_site_rules: boolean; intent?: string },
  ) => {
    const params = new URLSearchParams()
    if (q.return_origin) params.set('return_origin', q.return_origin)
    params.set('accept_privacy', q.accept_privacy ? '1' : '0')
    params.set('accept_site_rules', q.accept_site_rules ? '1' : '0')
    if (q.intent) params.set('intent', q.intent)
    return `/api/v1/auth/oauth/${provider}/start?${params.toString()}`
  },
  completeOAuthEmail: (body: { email: string; return_origin?: string }) =>
    api<RegisterPending>('/api/v1/auth/oauth/complete', { method: 'POST', body: JSON.stringify(body) }),
  identities: () => api<{ items: { provider: string; connected_at: string }[]; has_password: boolean }>('/api/v1/account/identities'),
  unlinkIdentity: (provider: string) =>
    api(`/api/v1/account/identities/${provider}`, { method: 'DELETE' }),
  register: (body: {
    email: string
    password: string
    first_name: string
    last_name: string
    accept_privacy: boolean
    accept_site_rules?: boolean
    return_origin?: string
  }) =>
    api<RegisterPending>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  resendRegister: (body: { email: string; return_origin?: string }) =>
    api<RegisterPending>('/api/v1/auth/register/resend', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: { email: string; return_origin?: string }) =>
    api<{ status: string; dev_token?: string }>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { token: string; password: string }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { login: string; password: string }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => api('/api/v1/auth/logout', { method: 'POST' }),
  me: () => api<MeUser>('/api/v1/account/me'),
  updateProfile: (body: { first_name: string; last_name: string }) =>
    api<MeUser>('/api/v1/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
  updateAvatar: (avatar_url: string) =>
    api<MeUser>('/api/v1/account/avatar', { method: 'PUT', body: JSON.stringify({ avatar_url }) }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api<{ status: string }>('/api/v1/account/password', { method: 'PUT', body: JSON.stringify(body) }),
}
