import type { Contacts } from '@gaido/api-client/api/types/catalog'

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

export function telegramHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '')
  return `https://t.me/${trimmed.replace(/^@/, '')}`
}

export function whatsappHref(value: string) {
  const digits = digitsOnly(value)
  return digits ? `https://wa.me/${digits}` : ''
}

export function viberHref(value: string) {
  const digits = digitsOnly(value)
  return digits ? `viber://chat?number=%2B${digits}` : ''
}

export function emailHref(value: string) {
  const trimmed = value.trim()
  return trimmed ? `mailto:${trimmed}` : ''
}

export type GuideContactLink = {
  key: 'telegram' | 'email' | 'whatsapp' | 'viber'
  label: string
  href: string
}

export function guideContactLinks(contacts: Contacts): GuideContactLink[] {
  if (!contacts.visible) return []

  const links: GuideContactLink[] = []
  if (contacts.telegram) {
    const href = telegramHref(contacts.telegram)
    if (href) links.push({ key: 'telegram', label: 'Telegram', href })
  }
  if (contacts.email) {
    const href = emailHref(contacts.email)
    if (href) links.push({ key: 'email', label: 'Email', href })
  }
  if (contacts.whatsapp) {
    const href = whatsappHref(contacts.whatsapp)
    if (href) links.push({ key: 'whatsapp', label: 'WhatsApp', href })
  }
  if (contacts.viber) {
    const href = viberHref(contacts.viber)
    if (href) links.push({ key: 'viber', label: 'Viber', href })
  }
  return links
}
