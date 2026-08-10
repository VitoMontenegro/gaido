import { api } from './http'

export type MeUser = {
  id: number
  login: string
  email: string
  first_name: string
  last_name: string
  roles: string[]
}

export function userDisplayName(me: Pick<MeUser, 'first_name' | 'last_name' | 'login'>): string {
  const name = `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim()
  return name || me.login
}

export const authApi = {
  register: (body: {
    email: string
    login: string
    password: string
    first_name: string
    last_name: string
    as_guide?: boolean
    accept_privacy: boolean
    accept_site_rules?: boolean
    accept_placement_rules?: boolean
  }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { login: string; password: string }) =>
    api<{ access_token: string; roles: string[] }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => api('/api/v1/auth/logout', { method: 'POST' }),
  me: () => api<MeUser>('/api/v1/account/me'),
  updateProfile: (body: { first_name: string; last_name: string }) =>
    api<MeUser>('/api/v1/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
}
