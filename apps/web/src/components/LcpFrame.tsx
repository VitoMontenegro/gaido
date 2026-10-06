import { staticAssetUrl } from '@gaido/site-urls/staticAsset'

type LcpKind = 'hero' | 'card'

const HERO = {
  '/svit': { src: '/images/home/excursions.webp', alt: 'Авторська екскурсія містом' },
  '/servis': { src: '/images/home/about.webp', alt: 'Послуги поруч' },
  '/vezu': { src: '/images/home/excursions.webp', alt: 'Міжнародні рейси' },
} as const

export function lcpImageForPath(pathname: string): { src: string; alt: string; kind: LcpKind } | null {
  if (pathname === '/') {
    return { src: staticAssetUrl('/images/home/guides.jpg'), alt: '', kind: 'card' }
  }
  const hero = HERO[pathname as keyof typeof HERO]
  if (!hero) return null
  return { src: staticAssetUrl(hero.src), alt: hero.alt, kind: 'hero' }
}

