export type BodyFont = 'roboto' | 'rubik'

export const BODY_FONT_STACK: Record<BodyFont, string> = {
  roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  rubik: '"Rubik", ui-sans-serif, system-ui, sans-serif',
}

export function normalizeBodyFont(value?: string | null): BodyFont {
  return value === 'roboto' ? 'roboto' : 'rubik'
}

export function applyBodyFont(value?: string | null) {
  if (typeof document === 'undefined') return
  const font = normalizeBodyFont(value)
  document.documentElement.style.setProperty('--font-sans', BODY_FONT_STACK[font])
  document.documentElement.dataset.bodyFont = font
}
