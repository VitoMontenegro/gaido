import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '@gaido/api-client/api/catalog'
import Breadcrumbs from './Breadcrumbs'
import { pageTitle } from '@gaido/site-urls/brand'
import { sanitizeHtml } from '../lib/html'
import { Seo } from '../lib/seo'
import type { LegalContent } from '@gaido/api-client/api/types/site'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

type LegalKey = keyof LegalContent

const LEGAL_SLUGS: Record<string, LegalKey> = {
  privacy: 'privacy_policy',
  'site-rules': 'site_rules',
  'placement-rules': 'placement_rules',
}

export function legalPath(slug: keyof typeof LEGAL_SLUGS) {
  return `/legal/${slug}`
}

export function LegalDocumentPage() {
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

type LegalFieldProps = {
  label: string
  page: { title: string; body_html: string }
  onChange: (page: { title: string; body_html: string }) => void
}

export function LegalPageEditor({ label, page, onChange }: LegalFieldProps) {
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium text-ink">{label}</h3>
      <input
        className="input"
        value={page.title}
        onChange={(e) => onChange({ ...page, title: e.target.value })}
        placeholder="Заголовок сторінки"
      />
      <Suspense fallback={<textarea className="input min-h-40" disabled placeholder="Завантаження редактора…" />}>
        <RichTextEditor
          value={page.body_html || '<p></p>'}
          onChange={(body_html) => onChange({ ...page, body_html })}
        />
      </Suspense>
    </section>
  )
}
