import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccessToken } from '@gaido/api-client/api/http'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { useLogout } from '@gaido/api-client/hooks/useLogout'
import BrandLogo from './BrandLogo'
import { guidesUrl } from '@gaido/site-urls/site'
import { PORTAL_SECTION_NAV } from '../lib/portalNav'

const PORTAL_NAV = PORTAL_SECTION_NAV.filter((item) => item.id !== 'home')

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

export default function PortalHeader() {
  const { data: me, isLoading } = useMe()
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
  const authPending = isLoading && !!getAccessToken()
  const isAdmin = me?.roles.includes('ROLE_ADMIN')
  const isModerator = me?.roles.includes('ROLE_MODERATOR')

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-divider/80 bg-page/95 shadow-sm backdrop-blur-md">
        <div className="container-site flex h-14 items-center gap-3 md:h-18 md:gap-6 justify-between">
          <BrandLogo compactOnMobile homeTo="/" />
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Розділи">
            {PORTAL_NAV.map((item) => (
              <a key={item.label} href={item.href()} className="rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-sand-100">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex h-9 items-center justify-end gap-1.5 md:gap-2">
            {authPending ? (
              <div className="hidden h-9 w-20 animate-pulse rounded-xl bg-sand-100/80 sm:block" aria-hidden />
            ) : me ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="btn-secondary hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
                    Адмін
                  </Link>
                )}
                {!isAdmin && isModerator && (
                  <Link to="/moderator" className="btn-secondary hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
                    Модератор
                  </Link>
                )}
                {!isAdmin && !isModerator && (
                  <a href={guidesUrl('/account')} className="btn-secondary hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
                    Кабінет
                  </a>
                )}
                <button type="button" onClick={logout} className="btn-ghost hidden px-2.5 py-1.5 text-sm sm:inline-flex md:py-2">
                  Вийти
                </button>
              </>
            ) : null}
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
      </header>
      <div className="site-header-spacer h-14 shrink-0 md:h-18" aria-hidden />
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" aria-label="Закрити меню" onClick={() => setMenuOpen(false)} />
          <nav
            id="mobile-nav"
            className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-divider bg-page px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
            aria-label="Мобільна навігація"
          >
            <ul className="space-y-1">
              {PORTAL_NAV.map((item) => (
                <li key={item.label}>
                  <a href={item.href()} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            {me && (
              <div className="mt-4 space-y-1 border-t border-divider pt-4">
                {isAdmin && (
                  <Link to="/admin" className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                    Адмін
                  </Link>
                )}
                {!isAdmin && isModerator && (
                  <Link to="/moderator" className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                    Модератор
                  </Link>
                )}
                {!isAdmin && !isModerator && (
                  <a href={guidesUrl('/account')} className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium text-ink transition hover:bg-sand-100">
                    Кабінет
                  </a>
                )}
                <button type="button" onClick={logout} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-base font-medium text-ink transition hover:bg-sand-100">
                  Вийти
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  )
}
