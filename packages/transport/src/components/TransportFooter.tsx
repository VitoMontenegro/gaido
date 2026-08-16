import BrandLogo from './BrandLogo'
import { SITE_TAGLINE } from '@gaido/site-urls/brand'

export default function TransportFooter() {
  return (
    <footer className="pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <BrandLogo className="mb-3" showTagline />
          <p className="text-sm text-muted">{SITE_TAGLINE}</p>
          <p className="mt-8 text-xs text-muted-light">© {new Date().getFullYear()} Gaido Vezu</p>
        </div>
      </div>
    </footer>
  )
}
