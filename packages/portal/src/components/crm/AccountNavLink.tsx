import { NavLink, useLocation } from 'react-router-dom'

export default function AccountNavLink({
  to,
  end,
  children,
  exceptPrefixes,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
  exceptPrefixes?: string[]
}) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const blocked = exceptPrefixes?.some((p) => pathname === p || pathname.startsWith(`${p}/`))
        return isActive && !blocked
          ? 'block rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white'
          : 'block rounded-xl px-3 py-2 text-sm text-ink transition hover:bg-sand-100'
      }}
    >
      {children}
    </NavLink>
  )
}
