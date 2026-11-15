import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inquiriesApi, type Inquiry } from '@gaido/api-client/api/inquiries'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { addMonths, toDateKey, type CalendarDateItem } from '../../lib/calendarUtils'
import { inquiryDayKey, inquiryStatusLabel, inquiryWhenLabel } from '../../lib/inquiryLabels'

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
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [day, setDay] = useState<string | null>(null)

  const { from, to } = monthRange(year, month)

  const agenda = useQuery({
    queryKey: ['guide-agenda', from, to],
    queryFn: () => inquiriesApi.agenda(from, to),
  })

  const items = agenda.data?.items ?? []

  const dates: CalendarDateItem[] = useMemo(() => {
    const map = new Map<string, CalendarDateItem>()
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
  }, [items])

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-display mb-1 text-xl font-bold">Календар заявок</h2>
        <p className="text-sm text-stone-600">Тут відображаються дати із заявок туристів. Натисніть на день, щоб переглянути деталі та відкрити листування.</p>
      </div>
      <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm text-stone-600">
        Доступні для бронювання дати змінюються в розділі <Link to="/account/guide/excursions" className="font-medium text-teal-dark underline">«Мої екскурсії»</Link>, у налаштуваннях екскурсії.
      </div>
      {agenda.isError && <p role="alert" className="text-sm text-red-700">Не вдалося завантажити заявки. Спробуйте ще раз.</p>}
      <AvailabilityCalendar
        year={year}
        month={month}
        dates={dates}
        selected={day}
        inquiryMode
        selectMode
        mobileSingleMonth
        onMonthChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
        onDateClick={setDay}
        loading={agenda.isLoading}
      />

      {day && (
        <DayScheduleDialog
          dateKey={day}
          inquiries={items.filter((inq) => inquiryDayKey(inq) === day)}
          onClose={() => setDay(null)}
        />
      )}
    </div>
  )
}

function DayScheduleDialog({ dateKey, inquiries, onClose }: {
  dateKey: string
  inquiries: Inquiry[]
  onClose: () => void
}) {
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
            <p className="text-sm text-stone-500">{inquiries.length ? `Заявок: ${inquiries.length}` : 'На цей день заявок немає'}</p>
          </div>
          <button type="button" className="text-stone-400 hover:text-ink" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {inquiries.length ? inquiries.map((inq) => <DayInquiryRow key={inq.id} inq={inq} />) : (
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-sm text-stone-600">Коли турист надішле заявку з цією датою, вона з’явиться тут.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function DayInquiryRow({ inq }: { inq: Inquiry }) {
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
          {` · ${inquiryWhenLabel(inq)}`}
        </span>
      </span>
      <span className="shrink-0 text-xs text-stone-500">{inquiryStatusLabel(inq.status)}</span>
    </Link>
  )
}
