import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type Props = {
  items: BreadcrumbItem[]
}

function buildSchema(items: BreadcrumbItem[]) {
  if (typeof window === 'undefined') return null

  const origin = window.location.origin
  const trail: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }, ...items]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => {
      const isLast = index === trail.length - 1
      const href = isLast && !item.to ? window.location.href : `${origin}${item.to ?? ''}`
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: href,
      }
    }),
  }
}

export default function Breadcrumbs({ items }: Props) {
  if (items.length === 0) return null

  const schema = buildSchema(items)
  const trail: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }, ...items]

  return (
    <>
      {schema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
      )}
      <div className="border-b border-divider bg-page">
        <nav className="container-site py-4 text-sm text-stone-500" aria-label="Навігаційний ланцюжок">
          <ol className="flex flex-wrap items-center">
            {trail.map((item, index) => (
              <li key={`${item.to ?? 'current'}-${item.label}`} className="flex items-center">
                {index > 0 && <span className="mx-2 text-stone-400" aria-hidden="true">/</span>}
                {item.to ? (
                  <Link to={item.to} className="hover:text-brand-700">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-stone-800" aria-current="page">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </>
  )
}
