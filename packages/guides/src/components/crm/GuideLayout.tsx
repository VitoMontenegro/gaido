import { NavLink, Outlet } from 'react-router-dom'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import { Seo } from '../../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

const TABS = [
  { to: '/account/guide', label: 'Огляд', end: true },
  { to: '/account/guide/profile', label: 'Профіль' },
  { to: '/account/guide/excursions', label: 'Екскурсії' },
  { to: '/account/guide/articles', label: 'Статті' },
  { to: '/account/guide/documents', label: 'Документи' },
  { to: '/account/guide/calendar', label: 'Календар' },
] as const

function tabClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
    : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand-100'
}

export default function GuideLayout() {
  const isGuide = useHasRole('ROLE_GUIDE')
  const tabs = isGuide ? TABS : TABS.filter((tab) => tab.to === '/account/guide/profile')

  return (
    <>
      <Seo title={pageTitle(isGuide ? 'Кабінет гіда' : 'Стати гідом')} path="/account/guide" noIndex />
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">{isGuide ? 'Кабінет гіда' : 'Стати гідом'}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {isGuide
              ? 'Керуйте профілем, екскурсіями та просуванням'
              : 'Заповніть профіль гіда на цьому акаунті — після цього можна додати екскурсії'}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={'end' in tab ? tab.end : false} className={tabClass}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </>
  )
}
