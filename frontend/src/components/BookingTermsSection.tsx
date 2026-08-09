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

export default function BookingTermsSection({ included, excluded, notesHtml, meetingPoint, className }: Props) {
  const inc = normalizeItems(included)
  const exc = normalizeItems(excluded)
  const notes = sanitizeHtml(notesHtml ?? '')
  const meeting = (meetingPoint ?? '').trim()
  if (!inc.length && !exc.length && !notes && !meeting) return null

  return (
    <section className={cn('mt-10 border-t border-divider pt-8', className)}>
      <h2 className="section-title-sm">Умови бронювання</h2>

      {(inc.length > 0 || exc.length > 0) && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {inc.length > 0 && (
            <div className="card-flat p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Що входить</h3>
              <ul className="mt-3 space-y-2.5">
                {inc.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal-dark">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exc.length > 0 && (
            <div className="card-flat p-5">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Що не входить</h3>
              <ul className="mt-3 space-y-2.5">
                {exc.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-bold text-muted">
                      ×
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {meeting && (
        <div className="mt-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Місце зустрічі</h3>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{meeting}</p>
        </div>
      )}

      {notes && (
        <div className="mt-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Додатково</h3>
          <div className="excursion-body mt-2" dangerouslySetInnerHTML={{ __html: notes }} />
        </div>
      )}
    </section>
  )
}
