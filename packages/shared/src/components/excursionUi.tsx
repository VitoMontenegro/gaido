import type { ExcursionStructuredContent } from '../lib/excursionStructuredContent'
import type { Contacts } from '../api/types/catalog'

export type ExcursionItem = {
  id: number
  guide_id?: number
  title: string
  slug: string
  description?: string
  cover_image_url?: string
  body_html?: string
  map_embed_url?: string
  structured_content?: ExcursionStructuredContent
  type: string
  max_guests: number
  price_from: number
  currency: string
  status: string
  duration_minutes?: number
  transport_mode?: string
  children_allowed?: boolean
  language?: string
  organizational_details?: string
  meeting_point?: string
  included_items?: string[]
  excluded_items?: string[]
  city_name?: string
  city_slug?: string
  guide_name?: string
  guide_slug?: string
  guide_avatar_url?: string
  guide_about?: string
  guide_contacts?: Contacts
  guide_rating_avg?: number
  guide_rating_count?: number
  rating_avg?: number
  rating_count?: number
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function excursionPreviewText(e: Pick<ExcursionItem, 'description' | 'body_html'>) {
  if (e.description?.trim()) return e.description.trim()
  if (e.body_html?.trim()) return stripHtml(e.body_html)
  return ''
}

export function formatExcursionRating(avg?: number, count?: number) {
  const reviews = count ?? 0
  if (reviews > 0) {
    return `★ ${(avg ?? 0).toFixed(1)} · ${reviews}`
  }
  return '★ —'
}

export function excursionStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED': return 'Опубліковано'
    case 'DRAFT': return 'Чернетка'
    case 'PENDING_MODERATION': return 'На модерації'
    case 'REJECTED': return 'Відхилено'
    default: return status
  }
}

export function excursionTypeLabel(type: string) {
  return type === 'GROUP' ? 'Групова' : 'Індивідуальна'
}

export function excursionPriceCaption(type: string) {
  const format = excursionTypeLabel(type).toLowerCase()
  if (type === 'GROUP') return `з особи / формат ${format}`
  return `за екскурсію / формат ${format}`
}

export function formatGroupSize(type: string, maxGuests: number) {
  if (type === 'GROUP') return `Груповий формат. До ${maxGuests} осіб`
  return `Індивідуальний формат. Для 1–${maxGuests} ${guestsWord(maxGuests)}`
}

function guestsWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'особи'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'осіб'
  return 'осіб'
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return ''
  const hours = minutes / 60
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `${h} ${hoursWord(h)}`
  }
  const label = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',')
  return `${label} ${hoursWord(Math.ceil(hours))}`
}

function hoursWord(h: number) {
  const n = Math.round(h)
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'година'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'години'
  return 'годин'
}

export function transportLabel(mode: string) {
  switch (mode) {
    case 'WALKING': return 'Пішки'
    case 'CAR': return 'На автомобілі'
    case 'TRANSPORT': return 'На транспорті'
    case 'BOAT': return 'На човні'
    case 'MIXED': return 'Пішки та транспортом'
    default: return mode
  }
}

export function transportShortLabel(mode: string) {
  switch (mode) {
    case 'WALKING': return 'пішки'
    case 'CAR': return 'на авто'
    case 'TRANSPORT': return 'транспортом'
    case 'BOAT': return 'на човні'
    case 'MIXED': return 'пішки та транспортом'
    default: return mode.toLowerCase()
  }
}

export function excursionCoverMetaLine(durationMinutes?: number, transportMode?: string) {
  const parts: string[] = []
  const duration = formatDuration(durationMinutes ?? 180)
  if (duration) parts.push(duration)
  const transport = transportShortLabel(transportMode ?? 'WALKING')
  if (transport) parts.push(transport)
  return parts.join(' • ')
}

export { languageLabel } from '../lib/excursionLanguages'

export function statusTone(status: string) {
  switch (status) {
    case 'PUBLISHED': return 'bg-emerald-100 text-emerald-800'
    case 'DRAFT': return 'bg-stone-200 text-stone-700'
    case 'PENDING_MODERATION': return 'bg-amber-100 text-amber-900'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    default: return 'bg-stone-100 text-stone-700'
  }
}

export function formatPrice(price: number | null | undefined, currency?: string) {
  const amount = Number(price ?? 0)
  const code = (currency || 'EUR').toUpperCase()
  const symbol = code === 'EUR' ? '€' : code === 'RUB' ? '₽' : code === 'USD' ? '$' : code
  return `від ${amount.toLocaleString('uk-UA')} ${symbol}`
}
