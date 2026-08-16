import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import AvailabilityCalendar from './AvailabilityCalendar'
import { dateKeyFromISO, type CalendarDateItem } from '../lib/calendarUtils'

type Slot = { id: number; starts_at: string; ends_at: string }

type Props = {
  excursionId: number
  excursionType: string
  priceFrom: number
  currency: string
}

export default function ExcursionDatesEditor({
  excursionId,
  excursionType,
  priceFrom,
  currency,
}: Props) {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const isGroup = excursionType === 'GROUP'

  const excursionDates = useQuery({
    queryKey: ['excursion-dates', excursionId],
    queryFn: () => api<{ items: Slot[] }>(`/api/v1/account/guide/excursions/${excursionId}/dates`),
    enabled: isGroup,
  })

  const guideSlots = useQuery({
    queryKey: ['slots'],
    queryFn: () => api<{ items: Slot[] }>('/api/v1/account/guide/calendar'),
    enabled: !isGroup,
  })

  const addExcursionDate = useMutation({
    mutationFn: (date: string) =>
      api(`/api/v1/account/guide/excursions/${excursionId}/dates`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['excursion-dates', excursionId] }),
  })

  const removeExcursionDate = useMutation({
    mutationFn: (dateId: number) =>
      api(`/api/v1/account/guide/excursions/${excursionId}/dates/${dateId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['excursion-dates', excursionId] }),
  })

  const addGuideSlot = useMutation({
    mutationFn: (date: string) =>
      api('/api/v1/account/guide/calendar/by-date', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })

  const removeGuideSlot = useMutation({
    mutationFn: (id: number) => api(`/api/v1/account/guide/calendar/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })

  const dates: CalendarDateItem[] = useMemo(() => {
    const items = isGroup ? excursionDates.data?.items : guideSlots.data?.items
    return (items ?? []).map((s) => ({
      id: s.id,
      date: dateKeyFromISO(s.starts_at),
      price: priceFrom,
      currency,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
    }))
  }, [isGroup, excursionDates.data, guideSlots.data, priceFrom, currency])

  const loading = isGroup ? excursionDates.isLoading : guideSlots.isLoading
  const pending =
    addExcursionDate.isPending ||
    removeExcursionDate.isPending ||
    addGuideSlot.isPending ||
    removeGuideSlot.isPending

  const handleClick = (dateKey: string, item?: CalendarDateItem) => {
    if (pending) return
    if (item?.id) {
      if (isGroup) removeExcursionDate.mutate(item.id)
      else removeGuideSlot.mutate(item.id)
    } else {
      if (isGroup) addExcursionDate.mutate(dateKey)
      else addGuideSlot.mutate(dateKey)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Доступні дати</h2>
        <p className="form-field-hint">
          {isGroup
            ? 'Дати цієї групової екскурсії. Клієнти бачать їх у каталозі та на сторінці туру.'
            : 'Календар спільний для всіх індивідуальних екскурсій. Зміни тут відображаються на кожній індивідуальній сторінці.'}
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
        onDateClick={handleClick}
        mode="edit"
        loading={loading || pending}
        title="Календар"
      />
    </div>
  )
}
