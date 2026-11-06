export const NOTIFICATION_LABELS: Record<string, string> = {
  EXCURSION_APPROVED: 'Екскурсію схвалено',
  EXCURSION_REJECTED: 'Екскурсію відхилено',
  SUBSCRIPTION_ACTIVATED: 'Підписку активовано',
  SUBSCRIPTION_EXPIRED: 'Підписка закінчилась',
  NEW_REVIEW: 'Новий відгук',
  INQUIRY_NEW: 'Нова заявка від туриста',
  INQUIRY_MESSAGE: 'Нове повідомлення в заявці',
  INQUIRY_HELP: 'Запит допомоги в чаті',
  INQUIRY_UPDATE: 'Оновлення заявки',
  REVIEW_COMMENT: 'Відповідь на відгук',
  REVIEW_DISPUTE: 'Оскарження відгуку',
}

export type InquiryNotifPayload = {
  inquiry_id?: number
  guide_id?: number
  status?: string
  review_id?: number
  guide_name?: string
  excursion_title?: string
  text_preview?: string
  rating?: number
}

export function parseNotificationPayload(raw: string): InquiryNotifPayload | null {
  try {
    return JSON.parse(raw) as InquiryNotifPayload
  } catch {
    return null
  }
}

export function notificationHref(type: string, payload: string, isGuide: boolean, isAdmin: boolean) {
  const data = parseNotificationPayload(payload)
  if (data?.inquiry_id) {
    if (isAdmin && type === 'INQUIRY_HELP') return '/admin?tab=inquiries'
    if (isGuide) return `/account/guide/inquiries/${data.inquiry_id}`
    return `/account/inquiries/${data.inquiry_id}`
  }
  if (type === 'NEW_REVIEW' || type === 'REVIEW_COMMENT') return isGuide ? '/account/guide' : '/account'
  if (type.startsWith('EXCURSION_') || type.startsWith('SUBSCRIPTION_')) return '/account/guide'
  return null
}
