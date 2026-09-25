import type { Contacts } from '@gaido/api-client/api/types/catalog'
import { GUIDES_HOST } from '@gaido/site-urls/site'

const CONTACT_PREFILL = `Вітаю, я пишу вам із сайту ${GUIDES_HOST}`

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function withPrefill(href: string, key: string) {
  const url = new URL(href)
  if (url.searchParams.has(key)) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}${key}=${encodeURIComponent(CONTACT_PREFILL)}`
}

export function telegramHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const href = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/$/, '')
    : `https://t.me/${trimmed.replace(/^@/, '')}`
  return withPrefill(href, 'text')
}

export function whatsappHref(value: string) {
  const digits = digitsOnly(value)
  return digits ? withPrefill(`https://wa.me/${digits}`, 'text') : ''
}

export function viberHref(value: string) {
  const digits = digitsOnly(value)
  return digits ? withPrefill(`viber://chat?number=%2B${digits}`, 'draft') : ''
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
