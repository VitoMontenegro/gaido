import { Fancybox } from '@fancyapps/ui'
import type { FancyboxOptions } from '@fancyapps/ui'
import { uk_UA } from '@fancyapps/ui/dist/fancybox/l10n/uk_UA'
import '@fancyapps/ui/dist/fancybox/fancybox.css'

const baseOptions: Partial<FancyboxOptions> = {
  theme: 'dark',
  l10n: uk_UA,
  Carousel: {
    infinite: false,
  },
}

export function openImageGallery(urls: string[], startIndex = 0) {
  if (urls.length === 0) return
  Fancybox.show(
    urls.map((src) => ({ src, type: 'image' })),
    { ...baseOptions, startIndex },
  )
}

export function openVideo(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return
  Fancybox.show([{ src: trimmed }], baseOptions)
}
