import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { portalUrl } from '@gaido/site-urls/site'

export default function DiscoverHeader() {
  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/90 backdrop-blur-md">
        <div className="container-site flex h-14 items-center justify-between gap-3 md:h-[72px]">
          <BrandLogo compactOnMobile homeTo="/" />
          <div className="flex items-center gap-2">
            <a href={portalUrl()} className="btn-ghost hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
              gaido.top
            </a>
            <Link to="/account" className="btn-secondary px-3 py-1.5 text-sm md:py-2">
              Кабінет
            </Link>
            <Link to="/login" className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
              Вхід
            </Link>
          </div>
        </div>
      </header>
      <div className="site-header-spacer h-14 shrink-0 md:h-[72px]" aria-hidden />
    </>
  )
}
