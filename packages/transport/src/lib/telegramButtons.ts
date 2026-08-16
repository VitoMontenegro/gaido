let defaultBotURL = ''

export function setTelegramBotURL(url: string) {
  defaultBotURL = url.replace(/\/$/, '')
}

function normalizeTelegramURL(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '')
  const username = trimmed.replace(/^@/, '')
  return `https://t.me/${username}`
}

export function resolveTelegramURL(el: HTMLElement): string | null {
  const attr = el.getAttribute('data-telegram')
  if (attr && attr !== '') {
    return normalizeTelegramURL(attr)
  }
  if (defaultBotURL) {
    return defaultBotURL
  }
  return null
}

export function initTelegramButtons() {
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const el = target.closest('[data-telegram]')
    if (!el || !(el instanceof HTMLElement)) return

    const url = resolveTelegramURL(el)
    if (!url) {
      console.warn('Telegram bot URL is not configured')
      return
    }

    event.preventDefault()
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}
