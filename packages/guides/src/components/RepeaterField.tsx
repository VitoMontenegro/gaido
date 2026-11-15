import { useEffect, useRef, type ReactNode } from 'react'

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
  const listRef = useRef<HTMLUListElement>(null)
  const focusNewItem = useRef(false)

  useEffect(() => {
    if (!focusNewItem.current) return
    focusNewItem.current = false
    listRef.current?.lastElementChild?.querySelector<HTMLElement>('input, textarea, select')?.focus()
  }, [items.length])

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
      <span className="form-field-label">{label}</span>
      {hint && <p className="form-field-hint">{hint}</p>}

      {items.length === 0 ? (
        <p className="excursion-parus-muted rounded-lg border border-dashed border-stone-200 px-3 py-4">
          Тут поки нічого немає.
        </p>
      ) : (
        <ul ref={listRef} className="space-y-2">
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
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-base disabled:opacity-40"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={`Перемістити пункт ${i + 1} вгору`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-lg text-red-600"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={`Видалити пункт ${i + 1}`}
                >
                  ×
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-base disabled:opacity-40"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Перемістити пункт ${i + 1} вниз`}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn-secondary mt-2 w-full gap-2 border-teal/40 text-teal-dark sm:w-auto"
        onClick={() => {
          focusNewItem.current = true
          onChange([...items, createItem()])
        }}
      >
        <span aria-hidden="true" className="text-xl leading-none">+</span>
        {addLabel}
      </button>
    </div>
  )
}
