import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMe, useHasRole } from '@gaido/api-client/hooks/useAuth'
import BrandLogo from './BrandLogo'
import { guidesUrl, portalUrl, servicesUrl } from '@gaido/site-urls/site'

const VEZU_NAV = [
  { to: '/search', label: 'Пошук' },
  { to: '/cities', label: 'Напрямки' },
  { to: '/carriers', label: 'Перевізники' },
] as const

function accountHref(roles: string[]): string {
  if (roles.includes('ROLE_ADMIN')) return '/admin'
  if (roles.includes('ROLE_MODERATOR')) return '/moderator'
  if (roles.includes('ROLE_CARRIER')) return '/account/rides'
  return '/account/bookings'
}

function addRideTarget(me?: { roles: string[] } | null): { to: string; state?: { from?: string; next?: string } } {
  if (!me) return { to: '/login', state: { from: '/account/rides/new' } }
  if (me.roles.includes('ROLE_CARRIER')) return { to: '/account/rides/new' }
  return { to: '/account/carrier', state: { next: '/account/rides/new' } }
}

function navActive(pathname: string, to: string): boolean {
  if (to === '/search') return pathname === '/search' || pathname.startsWith('/routes/')
  return pathname === to || pathname.startsWith(`${to}/`)
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path strokeLinecap="round" d="M4 7h16" />
          <path strokeLinecap="round" d="M4 12h16" />
          <path strokeLinecap="round" d="M4 17h16" />
        </>
      )}
    </svg>
  )
}

export default function TransportHeader() {
  const { data: me } = useMe()
  const isAdmin = useHasRole('ROLE_ADMIN')
  const isModerator = useHasRole('ROLE_MODERATOR')
  const isStaff = isAdmin || isModerator
  const location = useLocation()
  const ride = addRideTarget(me)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/90 backdrop-blur-md">
        <div className="container-site flex h-14 items-center justify-between gap-3 md:h-[72px]">
          <BrandLogo compactOnMobile homeTo="/" />

          <nav className="hidden items-center gap-1 md:flex">
            {VEZU_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  navActive(location.pathname, item.to) ? 'bg-brand-50 text-brand-800' : 'text-ink hover:bg-sand-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost p-2 md:hidden"
              aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MenuIcon open={menuOpen} />
            </button>
            {!isStaff && (
              <Link to={ride.to} state={ride.state} className="btn-secondary hidden px-3 py-1.5 text-sm sm:inline-flex md:py-2">
                Додати рейс
              </Link>
            )}
            {me ? (
              <Link to={accountHref(me.roles)} className="btn-primary px-3 py-1.5 text-sm md:py-2">
                {isStaff ? 'Адмін' : 'Кабінет'}
              </Link>
            ) : (
              <Link to="/login" className="btn-ghost hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
                Вхід
              </Link>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-divider bg-page px-4 py-3 md:hidden">
            <ul className="space-y-1">
              {VEZU_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-sand-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={guidesUrl('/')} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-sand-100">
                  Гіди
                </a>
              </li>
              <li>
                <a href={servicesUrl('/')} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-sand-100">
                  Сервіси
                </a>
              </li>
              <li>
                <a href={portalUrl('/')} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-sand-100">
                  gaido-ua.com
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>
      <div className="site-header-spacer h-14 shrink-0 md:h-[72px]" aria-hidden />
    </>
  )
}
