type Props = {
  items?: string[]
}

export default function ExcursionIncludedSection({ items }: Props) {
  const list = items?.filter(Boolean) ?? []
  if (list.length === 0) return null

  return (
    <section className="excursion-parus-section shadow-lg p-4">
      <h2 className="excursion-parus-section__title">Що включено</h2>
      <ul className="excursion-parus-checklist">
        {list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
