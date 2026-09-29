import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMe, useHasRole } from '@gaido/api-client/hooks/useAuth'
import { cn } from '@gaido/ui-primitives/cn'
import { SectionTopNav } from '@gaido/ui-primitives/SectionTopNav'
import BrandLogo from './BrandLogo'

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
  const [scrolled, setScrolled] = useState(false)
  const homeOverlay = location.pathname === '/'
  const solidHeader = !homeOverlay || scrolled

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!homeOverlay) return
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [homeOverlay])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header
        className={cn(
          'site-header fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300',
          solidHeader
            ? 'border-b border-divider/80 bg-page/95 shadow-sm backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="container-site">
          {!solidHeader && <SectionTopNav current="transport" />}
          <div className="flex h-14 items-center gap-3 md:h-18 md:gap-6">
            <BrandLogo compactOnMobile homeTo="/" variant={solidHeader ? 'default' : 'inverse'} />
            <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Головна навігація">
              {VEZU_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm transition',
                    navActive(location.pathname, item.to)
                      ? solidHeader
                        ? 'bg-teal text-white'
                        : 'bg-white/15 text-white'
                      : solidHeader
                        ? 'text-ink hover:bg-sand-100'
                        : 'text-white/90 hover:bg-white/10',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex h-9 items-center justify-end gap-1.5 md:ml-0 md:gap-2">
              {!isStaff && (
                <Link
                  to={ride.to}
                  state={ride.state}
                  className={cn(
                    'hidden px-3 py-2 text-sm sm:inline-flex',
                    solidHeader ? 'btn-secondary' : 'btn-ghost text-white hover:bg-white/10',
                  )}
                >
                  Додати рейс
                </Link>
              )}
              {me ? (
                <Link
                  to={accountHref(me.roles)}
                  className={cn('hidden py-2 sm:inline-flex', solidHeader ? 'btn-secondary' : 'btn-ghost text-white hover:bg-white/10')}
                >
                  {isStaff ? 'Адмін' : 'Кабінет'}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className={cn(
                    'px-2.5 py-1.5 text-sm md:py-2',
                    solidHeader ? 'btn-ghost' : 'btn-ghost text-white hover:bg-white/10',
                  )}
                >
                  Вхід
                </Link>
              )}
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition md:hidden',
                  solidHeader
                    ? 'border-border bg-surface text-ink hover:bg-sand-100'
                    : 'border-white/25 bg-white/10 text-white hover:bg-white/20',
                )}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MenuIcon open={menuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>
      {!homeOverlay && <div className="site-header-spacer h-14 shrink-0 md:h-18" aria-hidden />}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" aria-label="Закрити меню" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-nav" className={cn('absolute inset-x-0 overflow-y-auto border-b border-divider bg-page px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]', solidHeader ? 'top-14 max-h-[calc(100dvh-3.5rem)]' : 'top-[5.5rem] max-h-[calc(100dvh-5.5rem)]')} aria-label="Мобільна навігація">
            <ul className="space-y-1">
              {VEZU_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      'flex min-h-11 items-center rounded-xl px-3 text-base font-medium transition',
                      navActive(location.pathname, item.to) ? 'bg-ink text-white' : 'text-ink hover:bg-sand-100',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {!isStaff && (
                <li>
                  <Link to={ride.to} state={ride.state} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                    Додати рейс
                  </Link>
                </li>
              )}
            </ul>
            <div className="mt-4 space-y-1 border-t border-divider pt-4">
              {me ? (
                <Link to={accountHref(me.roles)} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                  {isStaff ? 'Адмін' : 'Особистий кабінет'}
                </Link>
              ) : (
                <Link to="/login" className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                  Вхід
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
