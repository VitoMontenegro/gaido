import type { Inquiry, InquiryStatus } from '@gaido/api-client/api/inquiries'

export function inquiryStatusLabel(status: InquiryStatus | string) {
  switch (status) {
    case 'new':
      return 'Первинний діалог'
    case 'discussing':
      return 'В роботі'
    case 'pending':
      return 'Очікує підтвердження'
    case 'booked':
      return 'Заброньовано'
    case 'done':
    case 'closed':
      return 'Виконано'
    case 'cancelled':
      return 'Скасовано'
    default:
      return status
  }
}

export function inquiryDateLabel(iso?: string | null) {
  if (!iso) return ''
  const day = iso.slice(0, 10)
  return new Date(`${day}T12:00:00`).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function inquiryWhenLabel(inq: Pick<Inquiry, 'scheduled_at' | 'preferred_date'>) {
  if (inq.scheduled_at) {
    return new Date(inq.scheduled_at).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return inquiryDateLabel(inq.preferred_date) || 'час узгоджується'
}

export function inquiryDayKey(inq: Pick<Inquiry, 'scheduled_at' | 'preferred_date'>) {
  const raw = inq.scheduled_at || inq.preferred_date
  return raw ? raw.slice(0, 10) : ''
}

export function inquiryHour(inq: Pick<Inquiry, 'scheduled_at'>) {
  if (!inq.scheduled_at) return null
  return new Date(inq.scheduled_at).getHours()
}
