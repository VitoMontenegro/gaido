import { useEffect, useRef } from 'react'
import ApiErrorBanner from '../ApiErrorBanner'
import type { ExcursionItem } from '../excursionUi'

export default function ReviewForm({
  excursions,
  fixedExcursionId,
  onSubmit,
  submitting,
  error,
  success,
}: {
  excursions?: ExcursionItem[]
  fixedExcursionId?: number
  onSubmit: (v: { excursion_id: number; rating: number; text: string }) => void
  submitting?: boolean
  error?: unknown
  success?: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const list = excursions ?? []

  useEffect(() => {
    if (success) formRef.current?.reset()
  }, [success])

  if (!fixedExcursionId && list.length === 0) {
    return (
      <p className="card text-sm text-stone-600">
        Відгуки можна залишити лише після появи опублікованих екскурсій.
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      className="card space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const excursionId = fixedExcursionId ?? Number(fd.get('excursion_id'))
        if (!excursionId) return
        onSubmit({
          excursion_id: excursionId,
          rating: Number(fd.get('rating')),
          text: String(fd.get('text') ?? ''),
        })
      }}
    >
      <p className="text-sm font-medium">Залишити відгук</p>
      <ApiErrorBanner
        error={error}
        hint={{
          UNAUTHORIZED: 'Увійдіть в акаунт, щоб залишити відгук',
          CONFLICT: 'Ви вже залишили відгук на цю екскурсію',
          REVIEW_ALREADY_EXISTS: 'Ви вже залишили відгук на цю екскурсію',
        }}
      />
      {success && !error && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Дякуємо! Відгук надіслано на модерацію.
        </p>
      )}
      {!fixedExcursionId && (
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Екскурсія</span>
          <select name="excursion_id" className="input" required defaultValue="" disabled={submitting}>
            <option value="" disabled>Оберіть екскурсію</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
      )}
      <select name="rating" className="input max-w-[120px]" defaultValue="5" disabled={submitting}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
      </select>
      <textarea name="text" className="input min-h-20" placeholder="Ваш відгук" required disabled={submitting} />
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Надсилання…' : 'Надіслати'}
      </button>
    </form>
  )
}
