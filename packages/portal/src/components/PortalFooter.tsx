import BrandLogo from './BrandLogo'
import { SITE_TAGLINE } from '@gaido/site-urls/brand'
import { guidesUrl } from '@gaido/site-urls/site'
import { PORTAL_SECTION_NAV } from '../lib/portalNav'

export default function PortalFooter() {
  return (
    <footer className="relative z-10 pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <BrandLogo className="mb-3" showTagline />
            </div>
            <nav aria-label="Розділи" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {PORTAL_SECTION_NAV.map((item) => (
                <a key={item.id} href={item.href()} className="link-accent">
                  {item.label}
                </a>
              ))}
              <a href={guidesUrl('/about')} className="link-accent">
                Про Gaido
              </a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-muted-light">© {new Date().getFullYear()} Gaido UA</p>
        </div>
      </div>
    </footer>
  )
}
