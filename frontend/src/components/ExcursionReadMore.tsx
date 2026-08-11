import { sanitizeHtml } from '../lib/html'

type Props = {
  teaser?: string
  bodyHtml?: string
}

export default function ExcursionReadMore({ teaser, bodyHtml }: Props) {
  const full = bodyHtml?.trim()
  const short = teaser?.trim()

  if (!short && !full) return null

  return (
    <section className="excursion-parus-section p-4 shadow-lg">
      <h2 className="excursion-parus-section__title">Що вас чекає на екскурсії</h2>
      {full ? (
        <div
          className="excursion-body"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(full) }}
        />
      ) : (
        <p className="excursion-parus-text">{short}</p>
      )}
    </section>
  )
}
