import { useEffect, useMemo, useRef, useState } from 'react'
import AvailabilityCalendar from './AvailabilityCalendar'
import { useDragScroll } from '../hooks/useDragScroll'
import {
  PARUS_CALENDAR_SHELL,
  groupDatesByMonth,
  isWeekend,
  monthLabelUpper,
  parseDateKey,
  weekdayShortUk,
  type CalendarDateItem,
} from '../lib/calendarUtils'

type Props = {
  dates: CalendarDateItem[]
  selected?: string | null
  onSelect: (dateKey: string, item?: CalendarDateItem) => void
  loading?: boolean
  emptyHint?: string
}

function CalendarIcon() {
  return (
    <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
      <path d="M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  )
}

function NavArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M4.1665 9.99996H15.8332M15.8332 9.99996L9.99984 4.16663M15.8332 9.99996L9.99984 15.8333" stroke="#0F1A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type StripProps = {
  monthGroups: Array<{ year: number; month: number; items: CalendarDateItem[] }>
  selected?: string | null
  onPick: (dateKey: string, item?: CalendarDateItem) => void
}

function HorizontalDateStrip({ monthGroups, selected, onPick }: StripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const { consumeDragClick } = useDragScroll(scrollRef, updateScrollButtons)

  useEffect(() => {
    updateScrollButtons()
  }, [monthGroups])

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const firstDay = el.querySelector<HTMLElement>('.calendar-day')
    const gap = window.matchMedia('(min-width: 640px)').matches ? 4 : 2
    const dayWidth = firstDay ? firstDay.offsetWidth + gap : 46
    el.scrollBy({ left: dir * dayWidth * 7, behavior: 'smooth' })
    window.setTimeout(updateScrollButtons, 350)
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="cursor-grab overflow-x-auto scroll-smooth pe-10 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        onScroll={updateScrollButtons}
      >
        <div className="flex min-w-max gap-4 sm:gap-8">
          {monthGroups.map((group) => (
            <div
              key={`${group.year}-${group.month}`}
              className="calendar-month flex shrink-0 flex-col"
              data-month={group.month}
              data-year={group.year}
            >
              <div className="calendar-month-header-sticky">
                <p className="text-[14px] text-[#0f1a28] sm:text-[16px]">
                  {monthLabelUpper(group.year, group.month)}
                </p>
              </div>
              <div className="grid auto-cols-[44px] grid-flow-col gap-0.5 sm:gap-1">
                {group.items.map((item) => {
                  const { day } = parseDateKey(item.date)
                  const isSelected = selected === item.date
                  const weekend = isWeekend(item.date)
                  return (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => {
                        if (consumeDragClick()) return
                        onPick(item.date, item)
                      }}
                      className={`calendar-day flex flex-col items-center justify-center gap-0 px-1.5 py-1.5 transition-all duration-200 sm:py-2 ${
                        isSelected
                          ? 'rounded-2xl bg-teal text-white'
                          : 'rounded-2xl bg-white text-[#0f1a28] hover:bg-brand-50'
                      }`}
                    >
                      <span className="text-[20px] font-medium leading-5">{day}</span>
                      <span
                        className={`text-[14px] font-light leading-4 ${
                          isSelected ? 'text-white/80' : weekend ? 'text-[#dc4732]' : 'text-[#0f1a28]/65'
                        }`}
                      >
                        {weekdayShortUk(item.date)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Попередні дати"
        onClick={() => scrollBy(-1)}
        className={`absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-start bg-gradient-to-r from-white via-white to-transparent transition-opacity ${canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <NavArrow direction="left" />
      </button>
      <button
        type="button"
        aria-label="Наступні дати"
        onClick={() => scrollBy(1)}
        className={`absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-end bg-gradient-to-l from-white via-white to-transparent transition-opacity ${canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <NavArrow direction="right" />
      </button>
    </>
  )
}

export default function PublicDateCalendar({ dates, selected, onSelect, loading, emptyHint }: Props) {
  const [popupOpen, setPopupOpen] = useState(false)
  const now = new Date()
  const [popupYear, setPopupYear] = useState(now.getFullYear())
  const [popupMonth, setPopupMonth] = useState(now.getMonth() + 1)

  const monthGroups = useMemo(() => {
    const groups = groupDatesByMonth(dates)
    for (const g of groups) {
      g.items.sort((a, b) => parseDateKey(a.date).day - parseDateKey(b.date).day)
    }
    return groups
  }, [dates])

  const handlePopupSelect = (dateKey: string, item?: CalendarDateItem) => {
    if (!item) return
    onSelect(dateKey, item)
    setPopupOpen(false)
  }

  return (
    <>
      <div className={PARUS_CALENDAR_SHELL}>
        <div className="relative flex w-full max-w-full items-end gap-1 sm:items-center sm:gap-4">
          <button
            type="button"
            className="mb-0.5 flex h-12 w-11 shrink-0 items-center justify-center rounded-3xl border-0 bg-teal text-white hover:opacity-90 sm:mb-3"
            aria-label="Відкрити календар"
            onClick={() => setPopupOpen(true)}
          >
            <CalendarIcon />
          </button>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            {loading ? (
              <p className="py-4 text-sm text-stone-500">Завантаження дат…</p>
            ) : monthGroups.length === 0 ? (
              <p className="py-4 text-sm text-stone-500">{emptyHint ?? 'Немає доступних дат.'}</p>
            ) : (
              <HorizontalDateStrip monthGroups={monthGroups} selected={selected} onPick={onSelect} />
            )}
          </div>
        </div>
      </div>

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal aria-label="Календар">
          <div className="max-h-[90vh] w-full overflow-auto rounded-t-3xl bg-white p-4 sm:max-w-[665px] sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Оберіть дату</h3>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100" aria-label="Закрити" onClick={() => setPopupOpen(false)}>
                ✕
              </button>
            </div>
            <AvailabilityCalendar
              year={popupYear}
              month={popupMonth}
              dates={dates}
              selected={selected}
              onMonthChange={(y, m) => {
                setPopupYear(y)
                setPopupMonth(m)
              }}
              onDateClick={handlePopupSelect}
              mode="view"
              loading={loading}
              title=""
            />
          </div>
        </div>
      )}
    </>
  )
}

export function DateFilterStrip({
  selected,
  onSelect,
  daysAhead = 60,
}: {
  selected?: string | null
  onSelect: (dateKey: string) => void
  daysAhead?: number
}) {
  const monthGroups = useMemo(() => {
    const items: CalendarDateItem[] = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      items.push({ date: toDateKeyLocal(d) })
    }
    return groupDatesByMonth(items)
  }, [daysAhead])

  return (
    <div className={PARUS_CALENDAR_SHELL}>
      <div className="relative flex w-full max-w-full items-end gap-1 sm:items-center sm:gap-4">
        <div className="mb-0.5 flex h-12 w-11 shrink-0 items-center justify-center rounded-3xl bg-teal text-white sm:mb-3" aria-hidden>
          <CalendarIcon />
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <HorizontalDateStrip
            monthGroups={monthGroups}
            selected={selected}
            onPick={(dateKey) => onSelect(dateKey)}
          />
        </div>
      </div>
    </div>
  )
}

function toDateKeyLocal(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
