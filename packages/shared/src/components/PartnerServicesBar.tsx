import { Link } from 'react-router-dom'
import { guidesUrl, isPortalSite } from '../lib/site'

type PartnerItem = {
  to: string
  external?: boolean
  title: string
  subtitle: string
  icon: string
  hideBelow?: 'lg' | 'md'
}

const ITEMS: PartnerItem[] = [
  {
    to: '/discover',
    title: 'Послуги',
    subtitle: 'поруч',
    icon: '📍',
  },
  {
    to: '/',
    external: true,
    title: 'Гіди та',
    subtitle: 'екскурсії',
    icon: '🧭',
  },
  {
    to: '/discover?section=transport',
    title: 'Транспорт',
    subtitle: 'та таксі',
    icon: '🚕',
    hideBelow: 'lg',
  },
  {
    to: '/jobs',
    title: 'Робота',
    subtitle: 'для українців',
    icon: '💼',
    hideBelow: 'md',
  },
  {
    to: '/places',
    title: 'Українські',
    subtitle: 'місця',
    icon: '🇺🇦',
    hideBelow: 'lg',
  },
  {
    to: '/help',
    title: 'Допомога',
    subtitle: 'українцям',
    icon: '🤝',
    hideBelow: 'md',
  },
  {
    to: '/looking',
    title: 'Я',
    subtitle: 'шукаю',
    icon: '🔎',
  },
]

function PartnerLink({ item }: { item: PartnerItem }) {
  const href = item.external ? guidesUrl(item.to) : item.to
  const className = `partner-bar__item ${item.hideBelow === 'lg' ? 'hidden lg:flex' : ''} ${item.hideBelow === 'md' ? 'hidden md:flex' : ''}`

  if (item.external) {
    return (
      <a href={href} className={className}>
        <span className="partner-bar__icon" aria-hidden>
          {item.icon}
        </span>
        <span className="partner-bar__text">
          {item.title}
          <br />
          {item.subtitle}
        </span>
      </a>
    )
  }

  return (
    <Link to={href} className={className}>
      <span className="partner-bar__icon" aria-hidden>
        {item.icon}
      </span>
      <span className="partner-bar__text">
        {item.title}
        <br />
        {item.subtitle}
      </span>
    </Link>
  )
}

export default function PartnerServicesBar({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (isPortalSite()) return null

  return (
    <nav
      className={`partner-bar ${variant === 'compact' ? 'partner-bar--compact' : ''}`}
      aria-label="Сервіси платформи"
    >
      <div className="partner-bar__inner container-site">
        {ITEMS.map((item) => (
          <PartnerLink key={item.to + item.title} item={item} />
        ))}
      </div>
    </nav>
  )
}
