import type { CrawlBody as CrawlBodyType } from '../lib/pageMeta'

/** Server-rendered text for crawlers (replaced visually by the client SPA). */
export function CrawlBody({ body, noIndex }: { body?: CrawlBodyType; noIndex?: boolean }) {
  if (noIndex || !body) return null
  const h1 = (body.h1 || '').trim()
  const paragraphs = (body.paragraphs || []).map((p) => p.trim()).filter(Boolean)
  const sections = body.sections || []
  const faq = body.faq || []
  if (!h1 && paragraphs.length === 0 && sections.length === 0 && faq.length === 0) return null

  return (
    <article
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
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
              <p>{item.answer}</p>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  )
}
