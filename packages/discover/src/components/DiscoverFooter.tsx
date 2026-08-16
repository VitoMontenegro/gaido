import BrandLogo from './BrandLogo'
import { SITE_TAGLINE } from '@gaido/site-urls/brand'
import { guidesUrl, portalUrl } from '@gaido/site-urls/site'

export default function DiscoverFooter() {
  return (
    <footer className="pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <BrandLogo className="mb-3" showTagline />
              <p className="text-sm text-muted">{SITE_TAGLINE}</p>
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              <a href={portalUrl()} className="link-accent">gaido.top</a>
              <a href={guidesUrl('/')} className="link-accent">Gaido Світ — гіди</a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-muted-light">© {new Date().getFullYear()} Gaido Servis</p>
        </div>
      </div>
    </footer>
  )
}
