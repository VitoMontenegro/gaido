import { useEffect } from 'react'
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline'
import ExcursionAvailabilityPanel from './ExcursionAvailabilityPanel'

type DialogProps = {
  open: boolean
  onClose: () => void
  slug: string
  excursionType: string
}

export function ExcursionAvailabilityDialog({ open, onClose, slug, excursionType }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-label="Доступні дати"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-auto rounded-t-3xl bg-white p-4 sm:max-w-[420px] sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Доступні дати</h3>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
            aria-label="Закрити"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <ExcursionAvailabilityPanel slug={slug} excursionType={excursionType} />
      </div>
    </div>
  )
}

type ButtonProps = {
  onClick: () => void
  className?: string
}

export function ExcursionAvailabilityButton({ onClick, className = '' }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-200 ${className}`}
      onClick={onClick}
    >
      <CalendarDaysIcon className="h-6 w-6" aria-hidden />
      Доступні дати
    </button>
  )
}
