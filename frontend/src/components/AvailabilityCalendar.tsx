import { useMemo } from 'react'
import {
  WEEKDAYS,
  addMonths,
  buildMonthGrid,
  isPastDate,
  monthLabelShort,
  upcomingMonths,
  type CalendarDateItem,
} from '../lib/calendarUtils'

const shellClass =
  'flex w-full max-w-full flex-col gap-3 overflow-hidden rounded-[32px] sm:border sm:border-[#eeeeee] bg-white sm:py-3 sm:px-4 sm:shadow-[0_0_20px_0_rgba(15,26,40,0.04)]'

type Props = {
  year: number
  month: number
  dates: CalendarDateItem[]
  selected?: string | null
  onMonthChange: (year: number, month: number) => void
  onDateClick?: (dateKey: string, item?: CalendarDateItem) => void
  mode?: 'view' | 'edit'
  layout?: 'single' | 'double'
  showMonthTabs?: boolean
  monthTabCount?: number
  readOnly?: boolean
  loading?: boolean
  title?: string
  emptyHint?: string
  footnote?: string
}

function MonthGrid({
  year,
  month,
  byDate,
  selected,
  mode,
  onDateClick,
  hideTitle,
  readOnly,
}: {
  year: number
  month: number
  byDate: Map<string, CalendarDateItem>
  selected?: string | null
  mode: 'view' | 'edit'
  onDateClick?: (dateKey: string, item?: CalendarDateItem) => void
  hideTitle?: boolean
  readOnly?: boolean
}) {
  const cells = buildMonthGrid(year, month)

  return (
    <div className="min-w-0 flex-1">
      {!hideTitle && (
        <p className="mb-2 text-center text-sm font-semibold text-stone-800">
          {monthLabelShort(year, month)} {year}
        </p>
      )}
      <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium text-stone-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, i) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`e-${year}-${month}-${i}`} className="h-11" />
          }
          const dateKey = cell.dateKey
          const item = byDate.get(dateKey)
          const past = isPastDate(dateKey)
          const available = !!item && !past
          const isSelected = !readOnly && selected === dateKey
          const clickable = !readOnly && (mode === 'edit' ? !past : available)
          const cellClass = `flex h-12 flex-col items-center justify-center rounded-lg px-0.5 ${
            isSelected
              ? 'bg-teal text-white shadow-sm'
              : available
                ? readOnly
                  ? 'bg-teal-100 text-brand-800'
                  : 'bg-teal-100 text-brand-800 hover:bg-brand-100'
                : past
                  ? 'text-stone-300'
                  : mode === 'edit'
                    ? 'text-stone-500 hover:bg-stone-50'
                    : 'text-stone-300'
          }`
          const content = (
            <>
              <span className="text-xs font-semibold leading-none">{cell.day}</span>

            </>
          )

          if (readOnly || !clickable) {
            return (
              <div key={dateKey} className={cellClass} aria-hidden={past}>
                {content}
              </div>
            )
          }

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateClick?.(dateKey, item)}
              className={`${cellClass} transition`}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthTabs({
  year,
  month,
  count,
  onChange,
}: {
  year: number
  month: number
  count: number
  onChange: (year: number, month: number) => void
}) {
  const tabs = useMemo(() => upcomingMonths(count), [count])

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.year === year && tab.month === month
        return (
          <button
            key={`${tab.year}-${tab.month}`}
            type="button"
            onClick={() => onChange(tab.year, tab.month)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              active
                ? 'bg-teal font-semibold text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {monthLabelShort(tab.year, tab.month)}
          </button>
        )
      })}
    </div>
  )
}

export default function AvailabilityCalendar({
  year,
  month,
  dates,
  selected,
  onMonthChange,
  onDateClick,
  mode = 'view',
  layout = 'double',
  showMonthTabs = false,
  monthTabCount = 8,
  readOnly = false,
  loading,
  title = 'Доступні дати',
  emptyHint,
  footnote,
}: Props) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDateItem>()
    for (const d of dates) map.set(d.date, d)
    return map
  }, [dates])

  const second = addMonths(year, month, 1)
  const singleMonth = layout === 'single'

  const prev = () => {
    const m = addMonths(year, month, -1)
    onMonthChange(m.year, m.month)
  }
  const next = () => {
    const m = addMonths(year, month, 1)
    onMonthChange(m.year, m.month)
  }

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        {title ? (
          <h3 className="font-display text-base font-bold text-stone-900 sm:text-lg">{title}</h3>
        ) : (
          <span />
        )}
        {!showMonthTabs && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-stone-600 hover:bg-stone-100"
              onClick={prev}
              aria-label="Попередній місяць"
            >
              ‹
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-stone-600 hover:bg-stone-100"
              onClick={next}
              aria-label="Наступний місяць"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {showMonthTabs && (
        <MonthTabs year={year} month={month} count={monthTabCount} onChange={onMonthChange} />
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">Завантаження…</p>
      ) : (
        <div
          className={`grid min-w-0 grid-cols-1 gap-4 ${singleMonth ? '' : 'sm:grid-cols-2 sm:gap-6'}`}
        >
          <MonthGrid
            year={year}
            month={month}
            byDate={byDate}
            selected={selected}
            mode={mode}
            onDateClick={onDateClick}
            hideTitle={showMonthTabs}
            readOnly={readOnly}
          />
          {!singleMonth && (
            <MonthGrid
              year={second.year}
              month={second.month}
              byDate={byDate}
              selected={selected}
              mode={mode}
              onDateClick={onDateClick}
            />
          )}
        </div>
      )}

      {emptyHint && !loading && dates.length === 0 && (
        <p className="text-center text-sm text-stone-500">{emptyHint}</p>
      )}

      {footnote && !loading && dates.length > 0 && (
        <p className="text-sm text-stone-500">{footnote}</p>
      )}

      {mode === 'edit' && (
        <p className="text-xs text-stone-500">Натисніть день, щоб додати або зняти дату.</p>
      )}
    </div>
  )
}
