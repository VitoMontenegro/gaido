import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@gaido/api-client/api/client'
import AvailabilityCalendar from './AvailabilityCalendar'
import { dateKeyFromISO, type CalendarDateItem } from '../lib/calendarUtils'

type PublicDate = {
  id: number
  starts_at: string
  ends_at: string
  price: number
  currency: string
}

type Props = {
  slug: string
  excursionType: string
}

export default function ExcursionAvailabilityPanel({ slug, excursionType }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery({
    queryKey: ['excursion-dates-public', slug, 'range'],
    queryFn: () =>
      api<{ items: PublicDate[] }>(`/api/v1/excursions/${slug}/dates?months=6`),
  })

  const calendarDates: CalendarDateItem[] = useMemo(() => {
    const seen = new Set<string>()
    const out: CalendarDateItem[] = []
    for (const d of data?.items ?? []) {
      const date = dateKeyFromISO(d.starts_at)
      if (seen.has(date)) continue
      seen.add(date)
      out.push({
        id: d.id,
        date,
        price: d.price,
        currency: d.currency,
        starts_at: d.starts_at,
        ends_at: d.ends_at,
      })
    }
    return out
  }, [data])

  const emptyHint =
    excursionType === 'GROUP'
      ? 'Гід ще не додав дати для цієї екскурсії.'
      : 'Гід ще не відкрив дати в календарі.'

  return (
    <AvailabilityCalendar
      year={year}
      month={month}
      dates={calendarDates}
      onMonthChange={(y, m) => {
        setYear(y)
        setMonth(m)
      }}
      mode="view"
      layout="single"
      showMonthTabs
      readOnly
      loading={isLoading}
      title="Доступні дати"
      emptyHint={emptyHint}
      footnote="Для бронювання напишіть гіду — він підтвердить дату та час."
    />
  )
}
