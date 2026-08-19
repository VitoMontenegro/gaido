import { Fancybox } from '@fancyapps/ui'
import type { FancyboxOptions } from '@fancyapps/ui'
import { uk_UA } from '@fancyapps/ui/dist/fancybox/l10n/uk_UA'
import '@fancyapps/ui/dist/fancybox/fancybox.css'
import { adminApi, type AdminGuideDocument } from '@gaido/api-client/api/client'

const baseOptions: Partial<FancyboxOptions> = {
  theme: 'dark',
  l10n: uk_UA,
  Carousel: {
    infinite: false,
  },
}

function slideType(mimeType: string) {
  return mimeType.startsWith('image/') ? 'image' : 'iframe'
}

export async function openGuideDocuments(docs: AdminGuideDocument[], startIndex = 0) {
  if (docs.length === 0) return

  const objectUrls: string[] = []
  try {
    const slides = await Promise.all(
      docs.map(async (doc) => {
        const { blob, contentType } = await adminApi.fetchGuideDocument(doc.id)
        const url = URL.createObjectURL(blob)
        objectUrls.push(url)
        return {
          src: url,
          type: slideType(contentType || doc.mime_type),
          caption: docTypeLabel(doc.type),
        }
      }),
    )
    Fancybox.show(slides, { ...baseOptions, startIndex })
  } finally {
    window.setTimeout(() => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }, 60_000)
  }
}

export function docTypeLabel(type: string) {
  if (type === 'GUIDE_LICENSE') return 'Ліцензія гіда'
  if (type === 'ENTERTAINER_LICENSE') return 'Ліцензія конферансьє'
  return type
}

export function guideTypeBadgeLabel(guide: { type_badge?: string; guide_type: string; catalog_status: string }) {
  if (guide.type_badge) return guide.type_badge
  if (guide.guide_type === 'COMPANION' || guide.catalog_status === 'companion') return 'Компаньйон'
  if (guide.guide_type === 'ENTERTAINER') return 'Конферансьє'
  if (guide.guide_type === 'GUIDE') return 'Гід'
  return 'Гід'
}
