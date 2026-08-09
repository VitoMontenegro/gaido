export function asHtml(raw?: string) {
  const t = (raw ?? '').trim()
  if (!t) return ''
  if (/<[a-z][\s\S]*>/i.test(t)) return t
  return `<p>${t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')}</p>`
}
