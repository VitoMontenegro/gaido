import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/account/guide/clients', label: 'Клієнти', hint: 'Історія заявок' },
  { to: '/account/guide/stats', label: 'Статистика', hint: 'Перегляди і відповіді' },
]

export function GuideMorePage() {
  return (
    <ul className="space-y-2">
      {LINKS.map((item) => (
        <li key={item.to}>
          <Link to={item.to} className="card flex items-center justify-between gap-3 hover:bg-sand-50">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-stone-500">{item.hint}</p>
            </div>
            <span aria-hidden>→</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
