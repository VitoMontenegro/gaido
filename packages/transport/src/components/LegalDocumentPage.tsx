import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { legalPath, LEGAL_SLUGS } from '@gaido/ui-primitives/legalPaths'
import Breadcrumbs from './Breadcrumbs'
import { pageTitle } from '@gaido/site-urls/brand'
import { sanitizeHtml } from '../lib/html'
import { Seo } from '../lib/seo'

export default function LegalDocumentPage() {
  const { slug = '' } = useParams()
  const key = LEGAL_SLUGS[slug]
  const { data, isLoading } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
  })

  if (!key) {
    return (
      <div className="container-site py-12">
        <p className="text-muted">Сторінку не знайдено.</p>
        <Link to="/" className="mt-4 inline-block text-teal hover:underline">На головну</Link>
      </div>
    )
  }

  const doc = data?.legal?.[key]
  const title = doc?.title || 'Документ'
  const body = doc?.body_html?.trim()

  return (
    <>
      <Seo title={pageTitle(title)} path={legalPath(slug as keyof typeof LEGAL_SLUGS)} />
      <Breadcrumbs items={[{ label: title }]} />
      <article className="container-site py-10 md:py-14">
        <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">{title}</h1>
        {isLoading ? (
          <p className="mt-6 text-muted">Завантаження…</p>
        ) : body ? (
          <div
            className="prose prose-neutral mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
          />
        ) : (
          <p className="mt-8 text-muted">Текст документа готується. Зверніться до адміністратора сайту.</p>
        )}
      </article>
    </>
  )
}
