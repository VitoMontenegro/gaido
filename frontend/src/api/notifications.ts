import { api } from './http'

export type NotificationItem = {
  id: number
  type: string
  payload: string
  read_at?: string | null
  created_at: string
}

export const notificationsApi = {
  list: (after?: number) => {
    const q = after ? `?after=${after}` : ''
    return api<{ items: NotificationItem[] }>(`/api/v1/notifications${q}`)
  },
  longpoll: (after: number, timeout = 25, signal?: AbortSignal) =>
    api<{ items: NotificationItem[] }>(
      `/api/v1/notifications/longpoll?after=${after}&timeout=${timeout}`,
      { signal },
    ),
  markRead: (id: number) =>
    api<{ status: string }>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
}
