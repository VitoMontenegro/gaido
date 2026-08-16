import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAccessToken } from '@gaido/api-client/api/http'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import BrandLogo from './BrandLogo'
import { cn } from '@gaido/ui-primitives/cn'

const GUIDES_NAV = [
  { to: '/search', label: 'Пошук' },
  { to: '/map', label: 'Карта' },
  { to: '/', label: 'Гіди' },
  { to: '/journal', label: 'Журнал' },
] as const

type GuidesHeaderProps = {
  onLogout: () => void
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

function navActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/' || pathname === '/guides' || pathname.startsWith('/guides/') || pathname.startsWith('/guide/')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

export default function GuidesHeader({ onLogout }: GuidesHeaderProps) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const authPending = isLoading && !!getAccessToken()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/90 backdrop-blur-md">
        <div className="container-site">
          <div className="flex h-14 items-center gap-3 md:h-[72px] md:gap-6">
            <BrandLogo compactOnMobile homeTo="/" />
            <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Головна навігація">
              {GUIDES_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm transition',
                    navActive(location.pathname, item.to) ? 'bg-ink text-white' : 'text-ink hover:bg-sand-100',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex h-9 min-w-[132px] items-center justify-end gap-1.5 md:ml-0 md:min-w-[220px] md:gap-2">
              {authPending ? (
                <div className="h-9 w-full max-w-[180px] animate-pulse rounded-xl bg-sand-100/80" aria-hidden />
              ) : me ? (
                <>
                  <span className="hidden text-sm text-muted lg:inline">{me.login}</span>
                  <Link to="/account" className="btn-secondary hidden py-2 sm:inline-flex">
                    Кабінет
                  </Link>
                  <button type="button" onClick={onLogout} className="btn-ghost hidden py-2 sm:inline-flex">
                    Вийти
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost px-2.5 py-1.5 text-sm md:py-2">
                    Вхід
                  </Link>
                  <Link to="/register/guide" className="btn-primary px-3 py-1.5 text-sm md:py-2">
                    Стати гідом
                  </Link>
                </>
              )}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-ink transition hover:bg-sand-100 md:hidden"
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
      <div className="site-header-spacer h-14 shrink-0 md:h-[72px]" aria-hidden />
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" aria-label="Закрити меню" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-nav" className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-divider bg-page px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]" aria-label="Мобільна навігація">
            <ul className="space-y-1">
              {GUIDES_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={cn('flex min-h-11 items-center rounded-xl px-3 text-base font-medium transition', navActive(location.pathname, item.to) ? 'bg-ink text-white' : 'text-ink hover:bg-sand-100')}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
