import type { ReactNode } from 'react'

type Props<T> = {
  label: string
  hint?: string
  items: T[]
  onChange: (items: T[]) => void
  createItem: () => T
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode
  addLabel?: string
}

export default function RepeaterField<T>({
  label,
  hint,
  items,
  onChange,
  createItem,
  renderItem,
  addLabel = 'Додати',
}: Props<T>) {
  const updateAt = (index: number, patch: Partial<T>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="form-field-label">{label}</span>
        <button
          type="button"
          className="excursion-parus-link"
          onClick={() => onChange([...items, createItem()])}
        >
          + {addLabel}
        </button>
      </div>
      {hint && <p className="form-field-hint">{hint}</p>}

      {items.length === 0 ? (
        <p className="excursion-parus-muted rounded-lg border border-dashed border-stone-200 px-3 py-4">
          Поки немає рядків — натисніть «{addLabel}».
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-lg border border-border bg-stone-50/80 p-3"
            >
              <span className="mt-2 w-6 shrink-0 text-center text-xs font-medium text-stone-400">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">{renderItem(item, i, (patch) => updateAt(i, patch))}</div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  className="rounded border border-border bg-white px-2 py-1 text-xs disabled:opacity-40"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label="Вгору"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-border bg-white px-2 py-1 text-xs text-red-600"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label="Видалити"
                >
                  ×
                </button>
                <button
                  type="button"
                  className="rounded border border-border bg-white px-2 py-1 text-xs disabled:opacity-40"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label="Вниз"
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
