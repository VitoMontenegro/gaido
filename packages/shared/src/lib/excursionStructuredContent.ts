export type ExcursionVideoContent = {
  url: string
  preview_desktop?: string
  preview_mobile?: string
}

export type ExcursionComfortItem = {
  title: string
  text: string
}

export type ExcursionStructuredContent = {
  gallery: string[]
  gallery_mobile_cover?: string
  route_stops: string[]
  route_disclaimer?: string
  photo_locations: string[]
  video?: ExcursionVideoContent
  comfort_items: ExcursionComfortItem[]
}

export const EMPTY_STRUCTURED_CONTENT: ExcursionStructuredContent = {
  gallery: [],
  route_stops: [],
  photo_locations: [],
  comfort_items: [],
}

/** public_key з медіа-сховища, відносний шлях або зовнішній URL */
export function isValidMediaRef(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return true
  return /\.(webp|jpe?g|png|gif|avif|heic)$/i.test(v)
}

export function normalizeStructuredContent(
  raw?: Partial<ExcursionStructuredContent> | null,
): ExcursionStructuredContent {
  if (!raw) return { ...EMPTY_STRUCTURED_CONTENT }
  return {
    gallery: raw.gallery?.map((s) => s.trim()).filter(isValidMediaRef) ?? [],
    gallery_mobile_cover: isValidMediaRef(raw.gallery_mobile_cover ?? '')
      ? raw.gallery_mobile_cover!.trim()
      : undefined,
    route_stops: raw.route_stops ?? [],
    route_disclaimer: raw.route_disclaimer,
    photo_locations: raw.photo_locations?.map((s) => s.trim()).filter(isValidMediaRef) ?? [],
    video: raw.video?.url?.trim()
      ? {
          url: raw.video.url.trim(),
          preview_desktop: isValidMediaRef(raw.video.preview_desktop ?? '')
            ? raw.video.preview_desktop!.trim()
            : undefined,
          preview_mobile: isValidMediaRef(raw.video.preview_mobile ?? '')
            ? raw.video.preview_mobile!.trim()
            : undefined,
        }
      : undefined,
    comfort_items:
      raw.comfort_items?.map((item) => ({
        title: item.title ?? '',
        text: item.text ?? '',
      })) ?? [],
  }
}

/** Видаляє порожні рядки repeater перед збереженням */
export function sanitizeStructuredContentForSave(
  content: ExcursionStructuredContent,
): ExcursionStructuredContent {
  const c = normalizeStructuredContent(content)
  return {
    ...c,
    route_stops: c.route_stops.map((s) => s.trim()).filter(Boolean),
    route_disclaimer: c.route_disclaimer?.trim() || undefined,
    comfort_items: c.comfort_items
      .map((item) => ({
        title: item.title.trim(),
        text: item.text.trim(),
      }))
      .filter((item) => item.title || item.text),
  }
}

export function hasStructuredContent(
  content: ExcursionStructuredContent,
  cover?: string,
): boolean {
  const c = normalizeStructuredContent(content)
  return (
    galleryUrls(c, cover).length > 0 ||
    c.route_stops.some((s) => s.trim()) ||
    c.photo_locations.length > 0 ||
    !!c.video?.url ||
    c.comfort_items.some((item) => item.title || item.text)
  )
}

export function galleryUrls(
  content: ExcursionStructuredContent | undefined,
  cover?: string,
): string[] {
  const c = normalizeStructuredContent(content)
  const candidates = [...c.gallery, c.gallery_mobile_cover, cover?.trim()].filter(Boolean) as string[]
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of candidates) {
    if (!isValidMediaRef(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

export function syncCoverFromGallery(
  cover: string,
  content: ExcursionStructuredContent,
): { cover: string; content: ExcursionStructuredContent } {
  const normalized = normalizeStructuredContent(content)
  if (normalized.gallery.length > 0) {
    return { cover: normalized.gallery[0], content: normalized }
  }
  if (isValidMediaRef(cover)) {
    return {
      cover: cover.trim(),
      content: { ...normalized, gallery: [cover.trim()] },
    }
  }
  if (normalized.gallery_mobile_cover) {
    return {
      cover: normalized.gallery_mobile_cover,
      content: { ...normalized, gallery: [normalized.gallery_mobile_cover] },
    }
  }
  return { cover: isValidMediaRef(cover) ? cover.trim() : '', content: normalized }
}
