import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inquiriesApi, type Inquiry, type InquiryStatus } from '@gaido/api-client/api/inquiries'
import { inquiryStatusLabel } from '../../lib/inquiryLabels'
import { formatDuration } from '../../lib/duration'
import DateTimePicker from './DateTimePicker'

const STEPS: InquiryStatus[] = ['new', 'discussing', 'pending', 'booked', 'done']

const GUIDE_REASONS = ['Немає вільного часу', 'Погодні умови', 'Група не зібралась', 'Інше']
const TOURIST_REASONS = ['Змінились плани', 'Не підходить час', 'Знайшли іншого гіда', 'Інше']

type Viewer = 'tourist' | 'guide' | 'admin'

function inquiryDurationMinutes(inquiry: Inquiry) {
  return inquiry.excursion_duration_minutes && inquiry.excursion_duration_minutes > 0
    ? inquiry.excursion_duration_minutes
    : 120
}

function initialWhen(inquiry: Inquiry): Date | null {
  if (inquiry.scheduled_at) return new Date(inquiry.scheduled_at)
  const day = inquiry.preferred_date?.slice(0, 10)
  if (!day) return null
  const d = new Date(`${day}T10:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function schedulePayload(start: Date, minutes: number) {
  const end = new Date(start.getTime() + minutes * 60_000)
  return { scheduled_at: start.toISOString(), scheduled_end_at: end.toISOString() }
}

export default function InquiryCrmActions({ inquiry, viewer }: { inquiry: Inquiry; viewer: Viewer }) {
  const qc = useQueryClient()
  const [start, setStart] = useState<Date | null>(() => initialWhen(inquiry))
  const durationMin = inquiryDurationMinutes(inquiry)
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof inquiriesApi.patch>[1]) => inquiriesApi.patch(inquiry.id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inquiry', inquiry.id] })
      void qc.invalidateQueries({ queryKey: ['guide-inquiries'] })
      void qc.invalidateQueries({ queryKey: ['guide-agenda'] })
      void qc.invalidateQueries({ queryKey: ['my-inquiries'] })
      setShowCancel(false)
    },
  })

  const open = inquiry.status === 'new' || inquiry.status === 'discussing' || inquiry.status === 'pending' || inquiry.status === 'booked'
  const reasons = viewer === 'tourist' ? TOURIST_REASONS : GUIDE_REASONS
  const cancelText = reason === 'Інше' ? custom.trim() : reason

  const stepIndex = useMemo(() => {
    const s = inquiry.status === 'closed' ? 'done' : inquiry.status
    const i = STEPS.indexOf(s as InquiryStatus)
    return i < 0 ? (inquiry.status === 'cancelled' ? -1 : 0) : i
  }, [inquiry.status])

  if (inquiry.status === 'cancelled' || inquiry.status === 'done' || inquiry.status === 'closed') {
    return (
      <div className="card space-y-2 text-sm">
        <p>
          Статус: <span className="font-medium">{inquiryStatusLabel(inquiry.status)}</span>
        </p>
        {inquiry.cancel_reason && <p className="text-stone-600">Причина: {inquiry.cancel_reason}</p>}
      </div>
    )
  }

  return (
    <div className="card space-y-3">
      <ol className="flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-2.5 py-1 text-xs ${
              i === stepIndex ? 'bg-teal text-white' : i < stepIndex ? 'bg-teal-100 text-brand-800' : 'bg-sand-100 text-stone-500'
            }`}
          >
            {inquiryStatusLabel(s)}
          </li>
        ))}
      </ol>

      {viewer !== 'tourist' && open && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">Дата і час у календарі</span>
            <DateTimePicker
              value={start}
              onChange={setStart}
              hint={
                inquiry.excursion_id
                  ? `Тривалість за екскурсією: ${formatDuration(durationMin) || `${durationMin} хв`}`
                  : `Тривалість за замовчуванням: ${formatDuration(durationMin)}`
              }
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={patch.isPending || !start}
              onClick={() => start && patch.mutate({ status: 'pending', ...schedulePayload(start, durationMin) })}
            >
              Запропонувати час
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={patch.isPending || !start}
              onClick={() => start && patch.mutate({ status: 'booked', ...schedulePayload(start, durationMin) })}
            >
              Забронювати
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {viewer !== 'tourist' && inquiry.status === 'new' && (
          <button type="button" className="btn-secondary text-sm" disabled={patch.isPending} onClick={() => patch.mutate({ status: 'discussing' })}>
            В роботу
          </button>
        )}
        {viewer === 'tourist' && inquiry.status === 'pending' && (
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={patch.isPending}
            onClick={() => patch.mutate({ status: 'booked', scheduled_at: inquiry.scheduled_at || undefined })}
          >
            Підтвердити бронювання
          </button>
        )}
        {viewer !== 'tourist' && inquiry.status === 'pending' && (
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={patch.isPending || !start}
            onClick={() =>
              patch.mutate({
                status: 'booked',
                ...(start ? schedulePayload(start, durationMin) : { scheduled_at: inquiry.scheduled_at || undefined }),
              })
            }
          >
            Підтвердити бронювання
          </button>
        )}
        {viewer !== 'tourist' && (inquiry.status === 'booked' || inquiry.status === 'pending') && (
          <button type="button" className="btn-secondary text-sm" disabled={patch.isPending} onClick={() => patch.mutate({ status: 'done' })}>
            Виконано
          </button>
        )}
        {open && (
          <button type="button" className="text-sm text-red-700 underline" onClick={() => setShowCancel((v) => !v)}>
            Скасувати заявку
          </button>
        )}
      </div>

      {showCancel && (
        <div className="space-y-2 rounded-xl bg-red-50 p-3">
          <p className="text-sm font-medium">Причина скасування</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                className={reason === r ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === 'Інше' && (
            <textarea className="input min-h-16 text-sm" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Коротко опишіть причину" />
          )}
          <button
            type="button"
            className="btn-primary bg-red-700 text-sm hover:bg-red-800"
            disabled={patch.isPending || cancelText.length < 3}
            onClick={() => patch.mutate({ status: 'cancelled', cancel_reason: cancelText })}
          >
            Підтвердити скасування
          </button>
        </div>
      )}

      {patch.isError && <p className="text-sm text-red-600">{(patch.error as Error).message}</p>}
    </div>
  )
}
