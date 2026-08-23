import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { SITE_NAME, SITE_TAGLINE } from '@gaido/site-urls/brand'
import { guidesUrl, portalUrl, servicesUrl } from '@gaido/site-urls/site'

const FOOTER_COLUMNS = [
  {
    title: 'Пасажирам',
    links: [
      { label: 'Пошук рейсів', url: '/search' },
      { label: 'Напрямки', url: '/cities' },
      { label: 'Мої бронювання', url: '/account/bookings' },
    ],
  },
  {
    title: 'Перевізникам',
    links: [
      { label: 'Реєстрація', url: '/register/driver' },
      { label: 'Кабінет', url: '/account/rides' },
      { label: 'Підписка', url: '/account/carrier/billing' },
    ],
  },
  {
    title: 'Право',
    links: [
      { label: 'Конфіденційність', url: '/legal/privacy' },
      { label: 'Правила сайту', url: '/legal/site-rules' },
    ],
  },
] as const

export default function TransportFooter() {
  return (
    <footer className="pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <div className="flex flex-wrap items-start gap-8 md:gap-16">
            <div className="w-full shrink-0 md:w-[312px]">
              <BrandLogo className="mb-3" showTagline />
              <p className="text-sm text-muted">{SITE_TAGLINE}</p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title} className="min-w-0 flex-1">
                  <p className="mb-3 font-display text-lg font-medium uppercase text-ink">{col.title}</p>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link to={link.url} className="text-base text-[#4b4b4b] transition hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-divider pt-6 text-sm text-muted">
            <a href={guidesUrl('/')} className="hover:underline">Гіди</a>
            <a href={servicesUrl('/')} className="hover:underline">Сервіси</a>
            <a href={portalUrl('/')} className="hover:underline">gaido.top</a>
            <p className="ml-auto text-xs text-muted-light">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
