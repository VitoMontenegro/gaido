export const GUIDE_ABOUT_MAX_LEN = 1000

export function guideAboutLen(text = ''): number {
  return Array.from(text).length
}

export function clampGuideAbout(text: string): string {
  const chars = Array.from(text)
  if (chars.length <= GUIDE_ABOUT_MAX_LEN) return text
  return chars.slice(0, GUIDE_ABOUT_MAX_LEN).join('')
}

export function stripGuideAboutLinks(text: string): string {
  const cleaned = text.replace(
    /\[(?:[^\]]*)\]\(\s*(?:https?:\/\/|www\.)[^)]+\)|(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:t\.me|telegram\.me|wa\.me|instagram\.com|facebook\.com|fb\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|vk\.com|maps\.app\.goo\.gl)(?:\/[^\s<>"']*)?|\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b|@[A-Za-z][A-Za-z0-9_]{3,31}\b/gi,
    ' ',
  )
  const lines = cleaned.split('\n').map((line) => line.replace(/[^\S\n]{2,}/g, ' ').trim())
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function displayGuideAbout(text?: string | null): string {
  if (!text) return ''
  return clampGuideAbout(stripGuideAboutLinks(text))
}

export function nextGuideAbout(current: string, next: string): string {
  const nextLen = guideAboutLen(next)
  const currentLen = guideAboutLen(current)
  if (nextLen <= GUIDE_ABOUT_MAX_LEN) return next
  if (currentLen > GUIDE_ABOUT_MAX_LEN && nextLen < currentLen) return next
  return clampGuideAbout(next)
}
