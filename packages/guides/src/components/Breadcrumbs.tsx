import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { absoluteUrl } from '../lib/seo'

export type BreadcrumbItem = {
  label: string
  to?: string
}

type Props = {
  items: BreadcrumbItem[]
  /** Canonical path for the current page (e.g. /countries/turkey). Used in JSON-LD. */
  currentPath?: string
}

function buildSchema(items: BreadcrumbItem[], currentPath?: string) {
  const trail: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }, ...items]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => {
      const isLast = index === trail.length - 1
      let href: string
      if (isLast) {
        href = currentPath ? absoluteUrl(currentPath) : item.to ? absoluteUrl(item.to) : absoluteUrl('/')
      } else {
        href = absoluteUrl(item.to ?? '/')
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: href,
      }
    }),
  }
}

export default function Breadcrumbs({ items, currentPath }: Props) {
  if (items.length === 0) return null

  const schema = buildSchema(items, currentPath)
  const trail: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }, ...items]

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
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
