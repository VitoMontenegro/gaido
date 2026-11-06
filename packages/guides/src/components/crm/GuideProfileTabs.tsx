import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/account/guide/profile', label: 'Профіль', end: true },
  { to: '/account/guide/documents', label: 'Документи' },
] as const

function tabClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white'
    : 'rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand-100'
}

export default function GuideProfileTabs() {
  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={'end' in tab ? tab.end : false} className={tabClass}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
