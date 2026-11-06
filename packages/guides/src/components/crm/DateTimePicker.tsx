import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DayPicker } from 'react-day-picker'
import { uk } from 'date-fns/locale'
import './day-picker.css'

const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2)
  const m = i % 2 === 0 ? 0 : 30
  if (h > 20) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}).filter((v): v is string => !!v)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function timeOf(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes() >= 30 ? 30 : 0)}`
}

function combine(day: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const next = new Date(day)
  next.setHours(h, m, 0, 0)
  return next
}

function formatLabel(d: Date) {
  return d.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DateTimePicker({
  value,
  onChange,
  hint,
}: {
  value: Date | null
  onChange: (next: Date) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState<Date | undefined>(value ?? undefined)
  const [time, setTime] = useState(value ? timeOf(value) : '10:00')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) return
    setDay(value)
    setTime(timeOf(value))
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const apply = (nextDay: Date | undefined, nextTime: string) => {
    if (!nextDay) return
    const picked = combine(nextDay, nextTime)
    onChange(picked)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="input flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={value ? 'text-ink' : 'text-stone-400'}>
          {value ? formatLabel(value) : 'Оберіть дату і час'}
        </span>
        <span className="text-stone-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-[min(100vw-2.5rem,22rem)] rounded-2xl border border-divider bg-white p-3 shadow-[0_16px_40px_rgba(15,26,40,0.12)]">
          <DayPicker
            mode="single"
            locale={uk}
            weekStartsOn={1}
            selected={day}
            onSelect={(next) => {
              setDay(next)
              if (next) apply(next, time)
            }}
            disabled={{ before: today }}
            style={
              {
                '--rdp-accent-color': '#2cb2ab',
                '--rdp-accent-background-color': '#ccfbf1',
                '--rdp-day-height': '36px',
                '--rdp-day-width': '36px',
                '--rdp-day_button-height': '34px',
                '--rdp-day_button-width': '34px',
              } as CSSProperties
            }
          />
          <div className="mt-2 border-t border-divider pt-2">
            <p className="mb-1.5 text-xs font-medium text-stone-500">Час початку</p>
            <div className="grid max-h-36 grid-cols-4 gap-1 overflow-y-auto">
              {HOURS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`rounded-lg px-2 py-1.5 text-xs ${
                    time === slot ? 'bg-teal text-white' : 'bg-sand-50 text-ink hover:bg-sand-100'
                  }`}
                  onClick={() => {
                    setTime(slot)
                    apply(day ?? today, slot)
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          {hint && <p className="mt-2 text-xs text-stone-500">{hint}</p>}
        </div>
      )}
    </div>
  )
}
