import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { guidesUrl, servicesUrl, transportUrl } from '@gaido/site-urls/site'

export default function PortalHeader() {
  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/90 backdrop-blur-md">
        <div className="container-site flex h-14 flex-wrap items-center justify-between gap-2 py-2 md:h-[72px] md:flex-nowrap md:py-0">
          <BrandLogo compactOnMobile homeTo="/" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a href={servicesUrl('/')} className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
              Сервіси
            </a>
            <a href={transportUrl('/')} className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
              Міжнародні перевезення
            </a>
            <a href={guidesUrl('/')} className="btn-primary px-3 py-1.5 text-sm md:py-2">
              Гіди
            </a>
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
