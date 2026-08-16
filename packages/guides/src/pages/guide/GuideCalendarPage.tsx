import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { dateKeyFromISO, type CalendarDateItem } from '../../lib/calendarUtils'

type Slot = { id: number; starts_at: string; ends_at: string; note: string }

export function GuideCalendarPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api<{ items: Slot[] }>('/api/v1/account/guide/calendar'),
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

  const dates: CalendarDateItem[] = useMemo(
    () =>
      (data?.items ?? []).map((s) => ({
        id: s.id,
        date: dateKeyFromISO(s.starts_at),
        starts_at: s.starts_at,
        ends_at: s.ends_at,
      })),
    [data],
  )

  const pending = addSlot.isPending || removeSlot.isPending

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="font-display mb-1 text-xl font-bold">Календар доступності</h2>
        <p className="text-sm text-stone-500">
          Загальний календар для індивідуальних екскурсій. Клієнти бачать вільні дати на сторінках турів і в пошуку.
        </p>
      </div>

      <AvailabilityCalendar
        year={year}
        month={month}
        dates={dates}
        onMonthChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
        onDateClick={(dateKey, item) => {
          if (pending) return
          if (item?.id) removeSlot.mutate(item.id)
          else addSlot.mutate(dateKey)
        }}
        mode="edit"
        loading={isLoading || pending}
        title="Доступні дати"
      />

      {(addSlot.isError || removeSlot.isError) && (
        <p className="text-sm text-red-600">{(addSlot.error ?? removeSlot.error)?.message}</p>
      )}
    </div>
  )
}
