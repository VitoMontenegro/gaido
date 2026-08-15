import { Helmet } from 'react-helmet-async'
import { NavLink, Outlet } from 'react-router-dom'

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
  return (
    <>
      <Helmet><title>Кабінет гіда</title></Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Кабінет гіда</h1>
          <p className="mt-1 text-sm text-stone-600">Керуйте профілем, екскурсіями та просуванням</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
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
