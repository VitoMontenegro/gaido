import { NavLink } from 'react-router-dom'

export default function AccountNavLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive
          ? 'block rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white'
          : 'block rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-sand-100'
      }
    >
      {children}
    </NavLink>
  )
}
