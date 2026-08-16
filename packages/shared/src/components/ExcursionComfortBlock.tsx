import type { ExcursionComfortItem } from '../lib/excursionStructuredContent'

type Props = {
  items: ExcursionComfortItem[]
}

export default function ExcursionComfortBlock({ items }: Props) {
  const list = items.filter((item) => item.title.trim() || item.text.trim())
  if (list.length === 0) return null

  return (
    <section className="excursion-parus-section p-4 shadow-lg">
      <h2 className="excursion-parus-section__title">Ваш комфорт — у пріоритеті</h2>
      <div className="excursion-parus-comfort">
        {list.map((item) => (
          <article key={item.title + item.text} className="excursion-parus-comfort__card">
            {item.title && <h3>{item.title}</h3>}
            {item.text && <p>{item.text}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}
