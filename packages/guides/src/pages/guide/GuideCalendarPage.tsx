import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import { inquiriesApi, type Inquiry } from '@gaido/api-client/api/inquiries'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { addMonths, dateKeyFromISO, isPastDate, toDateKey, type CalendarDateItem } from '../../lib/calendarUtils'
import { inquiryDayKey, inquiryHour, inquiryStatusLabel, inquiryWhenLabel } from '../../lib/inquiryLabels'

type Slot = { id: number; starts_at: string; ends_at: string; note: string }
type CalMode = 'view' | 'availability'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8)

function monthRange(year: number, month: number) {
  const from = toDateKey(year, month, 1)
  const next = addMonths(year, month, 2)
  const to = toDateKey(next.year, next.month, 1)
  return { from, to }
}

function dayTitle(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function GuideCalendarPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [mode, setMode] = useState<CalMode>('view')
  const [day, setDay] = useState<string | null>(null)

  const { from, to } = monthRange(year, month)

  const { data, isLoading } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api<{ items: Slot[] }>('/api/v1/account/guide/calendar'),
  })
  const agenda = useQuery({
    queryKey: ['guide-agenda', from, to],
    queryFn: () => inquiriesApi.agenda(from, to),
  })

  const addSlot = useMutation({
    mutationFn: (date: string) =>
      api('/api/v1/account/guide/calendar/by-date', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })

  const removeSlot = useMutation({
    mutationFn: (id: number) => api(`/api/v1/account/guide/calendar/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })

  const items = agenda.data?.items ?? []
  const slots = data?.items ?? []

  const dates: CalendarDateItem[] = useMemo(() => {
    const map = new Map<string, CalendarDateItem>()
    for (const s of slots) {
      const date = dateKeyFromISO(s.starts_at)
      map.set(date, {
        id: s.id,
        date,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
      })
    }
    for (const inq of items) {
      const date = inquiryDayKey(inq)
      if (!date) continue
      const cur = map.get(date) ?? { date }
      if (inq.status === 'booked') cur.bookedCount = (cur.bookedCount ?? 0) + 1
      else if (inq.status === 'pending') cur.pendingCount = (cur.pendingCount ?? 0) + 1
      else cur.discussingCount = (cur.discussingCount ?? 0) + 1
      map.set(date, cur)
    }
    return [...map.values()]
  }, [slots, items])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDateItem>()
    for (const d of dates) map.set(d.date, d)
    return map
  }, [dates])

  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const pending = addSlot.isPending || removeSlot.isPending || bulkBusy

  const setCalMode = (next: CalMode) => {
    setMode(next)
    setDay(null)
    setBulkError('')
  }

  const toggleDay = (dateKey: string) => {
    if (isPastDate(dateKey) || bulkBusy) return
    const slot = byDate.get(dateKey)
    if (slot?.id) removeSlot.mutate(slot.id)
    else addSlot.mutate(dateKey)
  }

  const toggleMonthDays = async (keys: string[]) => {
    if (pending) return
    setBulkError('')
    setBulkBusy(true)
    try {
      const allOpen = keys.every((key) => !!byDate.get(key)?.id)
      await Promise.all(
        keys.flatMap((key) => {
          const slot = byDate.get(key)
          if (allOpen) return slot?.id ? [removeSlot.mutateAsync(slot.id)] : []
          return slot?.id ? [] : [addSlot.mutateAsync(key)]
        }),
      )
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Не вдалося оновити дні')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-display mb-1 text-xl font-bold">Календар роботи</h2>
        <p className="text-sm text-stone-500">
          Два місяці поруч. У перегляді клік відкриває розклад дня. Доступність змінюється одразу по кліку.
        </p>
      </div>

      <div className="flex rounded-full bg-sand-100 p-1" role="tablist" aria-label="Режим календаря">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'view'}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm ${mode === 'view' ? 'bg-white font-semibold text-ink shadow-sm' : 'text-stone-600'}`}
          onClick={() => setCalMode('view')}
        >
          Перегляд
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'availability'}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm ${mode === 'availability' ? 'bg-white font-semibold text-ink shadow-sm' : 'text-stone-600'}`}
          onClick={() => setCalMode('availability')}
        >
          Доступність
        </button>
      </div>

      {mode === 'availability' && (
        <p className="text-sm text-stone-500">
          Клік по дню вмикає або вимикає вільний слот. Можна вибрати весь місяць і зняти вихідні. Броні на календарі
          лишаються.
        </p>
      )}

      <AvailabilityCalendar
        year={year}
        month={month}
        dates={dates}
        selected={mode === 'view' ? day : null}
        pickMode={mode === 'availability'}
        selectMode
        onMonthChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
        onToggleMonthDays={(keys) => void toggleMonthDays(keys)}
        onDateClick={(dateKey) => {
          if (mode === 'availability') {
            toggleDay(dateKey)
            return
          }
          setDay(dateKey)
        }}
        mode="edit"
        loading={isLoading}
      />

      {(addSlot.isError || removeSlot.isError || bulkError) && (
        <p className="text-sm text-red-600">{bulkError || (addSlot.error ?? removeSlot.error)?.message}</p>
      )}

      {mode === 'view' && day && (
        <DayScheduleDialog
          dateKey={day}
          item={byDate.get(day)}
          inquiries={items.filter((inq) => inquiryDayKey(inq) === day)}
          busy={pending}
          onClose={() => setDay(null)}
          onToggle={() => {
            const slot = byDate.get(day)
            if (slot?.id) removeSlot.mutate(slot.id)
            else addSlot.mutate(day)
          }}
        />
      )}
    </div>
  )
}

function DayScheduleDialog({
  dateKey,
  item,
  inquiries,
  busy,
  onClose,
  onToggle,
}: {
  dateKey: string
  item?: CalendarDateItem
  inquiries: Inquiry[]
  busy: boolean
  onClose: () => void
  onToggle: () => void
}) {
  const open = !!item?.id
  const byHour = new Map<number, Inquiry[]>()
  const untimed: Inquiry[] = []
  for (const inq of inquiries) {
    const h = inquiryHour(inq)
    if (h == null) untimed.push(inq)
    else {
      const list = byHour.get(h) ?? []
      list.push(inq)
      byHour.set(h, list)
    }
  }
  const busyHours = [...byHour.entries()].filter(([, list]) => list.some((i) => i.status === 'booked' || i.status === 'pending'))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="day-schedule-title">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Закрити" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="day-schedule-title" className="font-display text-lg font-bold capitalize">
              {dayTitle(dateKey)}
            </h3>
            <p className="text-sm text-stone-500">
              {open ? 'День відкритий для нових запитів' : 'День закритий для нових запитів'}
              {inquiries.length ? ` · ${inquiries.length} заявок` : ''}
            </p>
          </div>
          <button type="button" className="text-stone-400 hover:text-ink" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={open ? 'btn-secondary text-sm' : 'btn-primary text-sm'} disabled={busy} onClick={onToggle}>
            {open ? 'Закрити день' : 'Відкрити день'}
          </button>
        </div>

        {busyHours.length > 1 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            На цей день уже кілька броней. Перевірте години, перш ніж брати ще одну групу.
          </p>
        )}

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
          {untimed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Без узгодженого часу</p>
              {untimed.map((inq) => (
                <DayInquiryRow key={inq.id} inq={inq} />
              ))}
            </div>
          )}
          <div className="divide-y divide-divider overflow-hidden rounded-2xl border border-divider">
            {HOURS.map((hour) => {
              const list = byHour.get(hour) ?? []
              return (
                <div key={hour} className="grid grid-cols-[4.5rem_1fr] gap-3 px-3 py-2 text-sm">
                  <p className="pt-1 font-medium text-stone-500">{String(hour).padStart(2, '0')}:00</p>
                  <div className="min-w-0 space-y-1.5">
                    {list.length === 0 ? (
                      <p className="text-stone-400">вільно</p>
                    ) : (
                      list.map((inq) => <DayInquiryRow key={inq.id} inq={inq} compact />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DayInquiryRow({ inq, compact }: { inq: Inquiry; compact?: boolean }) {
  return (
    <Link
      to={`/account/guide/inquiries/${inq.id}`}
      className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 hover:bg-sand-100 ${
        inq.status === 'booked' ? 'bg-ink/5' : inq.status === 'pending' ? 'bg-amber-50' : 'bg-sand-50'
      }`}
    >
      <span className="min-w-0">
        <span className="block font-medium">{inq.tourist_name}</span>
        <span className="block truncate text-xs text-stone-500">
          {inq.excursion_title || `${inq.party_size} ос.`}
          {compact ? '' : ` · ${inquiryWhenLabel(inq)}`}
        </span>
      </span>
      <span className="shrink-0 text-xs text-stone-500">{inquiryStatusLabel(inq.status)}</span>
    </Link>
  )
}
