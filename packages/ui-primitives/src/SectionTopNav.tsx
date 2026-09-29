import { cn } from './cn'
import { guidesUrl, portalUrl, servicesUrl, transportUrl } from '@gaido/site-urls/site'

export type SectionId = 'portal' | 'guides' | 'services' | 'transport'

export const SECTION_LINKS: { id: SectionId; label: string; href: () => string }[] = [
  { id: 'portal', label: 'Головна', href: () => portalUrl('/') },
  { id: 'services', label: 'Послуги', href: () => servicesUrl('/') },
  { id: 'transport', label: 'Перевезення', href: () => transportUrl('/') },
  { id: 'guides', label: 'Екскурсії', href: () => guidesUrl('/') },
]

export function sectionLinksExcept(current: SectionId) {
  return SECTION_LINKS.filter((item) => item.id !== current)
}

/** Cross-section links shown above the logo only while the header is over the hero. */
export function SectionTopNav({ current }: { current: SectionId }) {
  const items = sectionLinksExcept(current)
  return (
    <nav aria-label="Розділи" className="flex h-8 w-full items-center justify-end gap-4">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href()}
          className={cn('text-xs font-medium text-white/80 transition hover:text-white')}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
