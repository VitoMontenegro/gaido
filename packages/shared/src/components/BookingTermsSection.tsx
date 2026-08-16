import { normalizeItems } from '../lib/bookingTerms'
import { cn } from '../lib/cn'
import { sanitizeHtml } from '../lib/html'

type Props = {
  included?: string[] | null
  excluded?: string[] | null
  notesHtml?: string | null
  meetingPoint?: string | null
  className?: string
}

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal-dark">
      ✓
    </span>
  )
}

function CrossIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
      ×
    </span>
  )
}

export default function BookingTermsSection({ included, excluded, notesHtml, meetingPoint, className }: Props) {
  const inc = normalizeItems(included)
  const exc = normalizeItems(excluded)
  const notes = sanitizeHtml(notesHtml ?? '')
  const meeting = (meetingPoint ?? '').trim()
  if (!inc.length && !exc.length && !notes && !meeting) return null

  return (
    <section className={cn('excursion-parus-section scroll-mt-28 p-4 shadow-lg', className)}>
      <h2 className="excursion-parus-section__title">Умови бронювання</h2>

      {(inc.length > 0 || exc.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {inc.length > 0 && (
            <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Що входить</h3>
              <ul className="mt-3 space-y-2.5">
                {inc.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-base leading-snug text-stone-800">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exc.length > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-700/80">Що не входить</h3>
              <ul className="mt-3 space-y-2.5">
                {exc.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-base leading-snug text-stone-800">
                    <CrossIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {meeting && (
        <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Місце зустрічі</h3>
          <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-stone-800">{meeting}</p>
        </div>
      )}

      {notes && (
        <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Додатково</h3>
          <div className="excursion-body mt-2 text-stone-800" dangerouslySetInnerHTML={{ __html: notes }} />
        </div>
      )}
    </section>
  )
}
