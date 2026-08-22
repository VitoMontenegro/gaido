import { Suspense } from 'react'
import { lazyRichTextEditor } from '@gaido/ui-primitives/lazyRichTextEditor'

const RichTextEditor = lazyRichTextEditor(() => import('./RichTextEditor'))

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
