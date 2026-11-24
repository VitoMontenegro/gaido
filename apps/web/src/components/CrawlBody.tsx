import { sanitizeInlineHtml } from '@gaido/guides/lib/html'
import type { CrawlBody as CrawlBodyType } from '../lib/pageMeta'

const HIDDEN_STYLE = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

/**
 * Server-rendered page text from Go crawl_body.
 * visible=false: pre-hydration copy, visually hidden (SPA replaces it).
 * visible=true: readable fallback shown by ErrorBoundary when the client app fails,
 * so users and Googlebot see the real page text instead of a technical banner.
 */
export function CrawlBody({ body, noIndex, visible = false }: { body?: CrawlBodyType; noIndex?: boolean; visible?: boolean }) {
  if (noIndex || !body) return null
  const h1 = (body.h1 || '').trim()
  const paragraphs = (body.paragraphs || []).map((p) => p.trim()).filter(Boolean)
  const sections = body.sections || []
  const faq = body.faq || []
  if (!h1 && paragraphs.length === 0 && sections.length === 0 && faq.length === 0) return null

  return (
    <article
      {...(visible
        ? { className: 'container-site space-y-4 py-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:underline' }
        : { 'aria-hidden': true, style: HIDDEN_STYLE })}
    >
      {h1 ? <h1>{h1}</h1> : null}
      {paragraphs.map((p, i) => (
        <p key={`p-${i}`}>{p}</p>
      ))}
      {sections.map((sec, i) => (
        <section key={`s-${i}`}>
          {sec.title ? <h2>{sec.title}</h2> : null}
          {(sec.paragraphs || []).map((p, j) => (
            <p key={`sp-${i}-${j}`}>{p}</p>
          ))}
          {sec.links && sec.links.length > 0 ? (
            <ul>
              {sec.links.map((link, j) => (
                <li key={`l-${i}-${j}`}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {faq.length > 0 ? (
        <section>
          <h2>Часті запитання</h2>
          {faq.map((item, i) => (
            <div key={`f-${i}`}>
              <h3>{item.question}</h3>
              <p dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(item.answer) }} />
            </div>
          ))}
        </section>
      ) : null}
    </article>
  )
}
