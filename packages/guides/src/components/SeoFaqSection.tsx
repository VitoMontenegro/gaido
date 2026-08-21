import { useState } from 'react'
import type { FaqItem } from '../lib/seoTemplates'

type Props = {
  items: FaqItem[]
  title?: string
}

export default function SeoFaqSection({ items, title = 'Часті запитання' }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (items.length === 0) return null

  return (
    <section className="mt-10 border-t border-divider pt-8 md:mt-12 md:pt-10">
      <h2 className="section-title mb-4 text-xl md:text-2xl">{title}</h2>
      <div className="divide-y divide-divider rounded-2xl border border-divider bg-surface">
        {items.map((item, index) => {
          const open = openIndex === index
          return (
            <div key={item.question}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-base font-medium text-ink md:px-5"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
              >
                {item.question}
                <span className={`shrink-0 text-brand-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
                  ▾
                </span>
              </button>
              {open && (
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted md:px-5 md:text-base">
                  {item.answer}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
