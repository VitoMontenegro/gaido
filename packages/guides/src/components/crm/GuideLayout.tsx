import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import { Seo } from '../../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

const WORK = [
  { to: '/account/guide', label: 'Сьогодні', end: true },
  { to: '/account/guide/inquiries', label: 'Заявки' },
  { to: '/account/guide/calendar', label: 'Календар' },
  { to: '/account/guide/clients', label: 'Клієнти' },
  { to: '/account/guide/stats', label: 'Статистика' },
] as const

const MOBILE = [
  { to: '/account/guide', label: 'Сьогодні', end: true },
  { to: '/account/guide/inquiries', label: 'Заявки' },
  { to: '/account/guide/calendar', label: 'Календар' },
  { to: '/account/guide/more', label: 'Ще' },
] as const

function tabClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
    : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand-100'
}

export default function GuideLayout() {
  const isGuide = useHasRole('ROLE_GUIDE')
  const { pathname } = useLocation()
  const becoming = !isGuide
  const title = becoming ? 'Стати гідом' : pathname.startsWith('/account/guide/more') ? 'Кабінет' : 'Кабінет гіда'

  return (
    <>
      <Seo title={pageTitle(title)} path="/account/guide" noIndex />
      <div className="space-y-5 pb-24 md:pb-0">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {becoming
              ? 'Заповніть профіль гіда на цьому акаунті — після цього можна додати екскурсії'
              : 'Заявки, розклад і те, що платформа реально вимірює'}
          </p>
        </div>
        {isGuide ? (
          <>
            <nav className="hidden flex-wrap gap-2 md:flex">
              {WORK.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={'end' in tab ? tab.end : false} className={tabClass}>
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          </>
        ) : (
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/account/guide/profile" className={tabClass}>
              Профіль
            </NavLink>
          </nav>
        )}
        <Outlet />
      </div>
      {isGuide && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-white/95 backdrop-blur-sm md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid grid-cols-4">
            {MOBILE.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={'end' in tab ? tab.end : false}
                className={({ isActive }) =>
                  `px-2 py-3 text-center text-xs font-medium ${isActive ? 'text-teal' : 'text-stone-500'}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
