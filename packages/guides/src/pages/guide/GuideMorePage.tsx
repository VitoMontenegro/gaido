import { Link } from 'react-router-dom'
import AccountExitButton from '../../components/AccountExitButton'

const LINKS = [
  { to: '/account/guide/profile', label: 'Мій профіль', hint: 'Фото, опис та контакти' },
  { to: '/account/guide/documents', label: 'Документи', hint: 'Ліцензії та кваліфікація' },
  { to: '/account/guide/reviews', label: 'Відгуки', hint: 'Відгуки мандрівників' },
  { to: '/account/guide/articles', label: 'Статті', hint: 'Ваші публікації' },
  { to: '/account/guide/billing', label: 'Розміщення та оплати', hint: 'Профіль у каталозі та просування' },
  { to: '/account/guide/instructions', label: 'Допомога та інструкції', hint: 'Як користуватися кабінетом' },
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
      <li className="border-t border-divider pt-3">
        <AccountExitButton className="border border-red-100 bg-white px-4" />
      </li>
    </ul>
  )
}
