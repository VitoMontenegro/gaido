import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formatApiError } from '@gaido/api-client/api/client'
import AvailabilityCalendar from './AvailabilityCalendar'
import { buildMonthDatePlan } from '../lib/monthDatePlan'
import { dateKeyFromISO, type CalendarDateItem } from '../lib/calendarUtils'

type Slot = { id: number; starts_at: string; ends_at: string }

type Props = {
  excursionId: number
  excursionType: string
  priceFrom: number
  currency: string
  /** Повідомляє, чи є хоча б одна відкрита майбутня дата (null — ще завантажується). */
  onUpcomingChange?: (hasUpcoming: boolean | null) => void
}

export default function ExcursionDatesEditor({
  excursionId,
  excursionType,
  priceFrom,
  currency,
  onUpcomingChange,
}: Props) {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<{ error: boolean; text: string } | null>(null)
  const bulkLock = useRef(false)
  const [retryMonth, setRetryMonth] = useState<{ keys: string[]; selected: boolean } | null>(null)

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
  useEffect(() => {
    if (!onUpcomingChange) return
    if (loading) {
      onUpcomingChange(null)
      return
    }
    const nowMs = Date.now()
    onUpcomingChange(dates.some((d) => d.ends_at && new Date(d.ends_at).getTime() > nowMs))
  }, [loading, dates, onUpcomingChange])
  const pending =
    bulkBusy ||
    addExcursionDate.isPending ||
    removeExcursionDate.isPending ||
    addGuideSlot.isPending ||
    removeGuideSlot.isPending

  const handleClick = (dateKey: string, item?: CalendarDateItem) => {
    if (pending || bulkLock.current || retryMonth) return
    setBulkMessage(null)
    if (item?.id) {
      if (isGroup) removeExcursionDate.mutate(item.id)
      else removeGuideSlot.mutate(item.id)
    } else {
      if (isGroup) addExcursionDate.mutate(dateKey)
      else addGuideSlot.mutate(dateKey)
    }
  }

  const toggleMonthDays = async (keys: string[], target?: boolean) => {
    if (pending || bulkLock.current) return
    bulkLock.current = true
    setBulkBusy(true)
    setBulkMessage(null)
    const currentQuery = isGroup ? excursionDates : guideSlots
    const queryKey = isGroup ? ['excursion-dates', excursionId] : ['slots']
    try {
      const fresh = await currentQuery.refetch()
      if (fresh.isError || !fresh.data) throw new Error('Не вдалося завантажити наявні дати. Спробуйте ще раз.')
      const selected = target ?? !buildMonthDatePlan(keys, fresh.data.items).remove
      // Keep the explicit intent if the response is lost; retry never inverts it.
      setRetryMonth({ keys, selected })
      await api(isGroup
        ? `/api/v1/account/guide/excursions/${excursionId}/dates/days`
        : '/api/v1/account/guide/calendar/days', {
        method: 'PUT', body: JSON.stringify({ dates: keys, selected }),
      })
      const refreshed = await currentQuery.refetch()
      if (refreshed.isError) throw new Error('Дати збережено, але не вдалося оновити календар. Повторіть перевірку.')
      setRetryMonth(null)
      setBulkMessage({ error: false, text: selected ? 'Усі доступні дні цього місяця вибрано.' : 'Доступні дати цього місяця знято.' })
    } catch (error) {
      await qc.invalidateQueries({ queryKey })
      setBulkMessage({ error: true, text: formatApiError(error) })
    } finally {
      bulkLock.current = false
      setBulkBusy(false)
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
        mobileSingleMonth
        onMonthChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
        onDateClick={handleClick}
        mode="edit"
        onToggleMonthDays={(keys) => { if (!retryMonth) void toggleMonthDays(keys) }}
        loading={loading}
        busy={pending || !!retryMonth}
      />
      {bulkBusy && <p role="status" className="text-sm text-stone-600">Оновлюємо дати місяця…</p>}
      {bulkMessage && <p role={bulkMessage.error ? 'alert' : 'status'} className={bulkMessage.error ? 'text-sm text-red-700' : 'text-sm text-emerald-700'}>{bulkMessage.text}</p>}
      {retryMonth && !bulkBusy && (
        <button type="button" className="btn btn-outline" onClick={() => void toggleMonthDays(retryMonth.keys, retryMonth.selected)}>
          Спробувати ще раз
        </button>
      )}
      {(excursionDates.isError || guideSlots.isError || addExcursionDate.isError || removeExcursionDate.isError || addGuideSlot.isError || removeGuideSlot.isError) && (
        <p role="alert" className="text-sm text-red-700">Не вдалося завантажити або оновити дати. Спробуйте ще раз.</p>
      )}
    </div>
  )
}
