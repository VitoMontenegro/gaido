import { useState, type ReactNode } from 'react'
import {
  EXCLUDED_PRESETS,
  INCLUDED_PRESETS,
  normalizeItems,
  toggleItem,
} from '../lib/bookingTerms'

type Props = {
  included: string[]
  excluded: string[]
  onIncludedChange: (items: string[]) => void
  onExcludedChange: (items: string[]) => void
  notes: ReactNode
  disabled?: boolean
}

function ChipGroup({
  label,
  presets,
  selected,
  onToggle,
  disabled,
  tone,
}: {
  label: string
  presets: readonly string[]
  selected: string[]
  onToggle: (item: string) => void
  disabled?: boolean
  tone: 'include' | 'exclude'
}) {
  const [custom, setCustom] = useState('')
  const customSelected = selected.filter((s) => !presets.includes(s as never))

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((item) => {
          const on = selected.includes(item)
          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(item)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                on
                  ? tone === 'include'
                    ? 'border-teal bg-teal/10 text-teal-dark'
                    : 'border-brand-500 bg-brand-50 text-teal'
                  : 'border-border bg-surface text-ink hover:bg-sand-100'
              }`}
            >
              {on ? (tone === 'include' ? '✓ ' : '× ') : ''}
              {item}
            </button>
          )
        })}
        {customSelected.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(item)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              tone === 'include'
                ? 'border-teal bg-teal/10 text-teal-dark'
                : 'border-brand-500 bg-brand-50 text-teal'
            }`}
          >
            {tone === 'include' ? '✓ ' : '× '}
            {item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={custom}
          disabled={disabled}
          placeholder="Свій пункт…"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const v = custom.trim()
            if (!v) return
            onToggle(v)
            setCustom('')
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={disabled || !custom.trim()}
          onClick={() => {
            const v = custom.trim()
            if (!v) return
            onToggle(v)
            setCustom('')
          }}
        >
          Додати
        </button>
      </div>
    </div>
  )
}

export default function BookingTermsEditor({
  included,
  excluded,
  onIncludedChange,
  onExcludedChange,
  notes,
  disabled,
}: Props) {
  const inc = normalizeItems(included)
  const exc = normalizeItems(excluded)

  return (
    <div className="card-flat space-y-6 p-4 md:p-5">
      <div>
        <h3 className="font-display text-base font-medium uppercase text-ink">Умови бронювання</h3>
        <p className="mt-1 text-sm text-muted">
          Оберіть пункти — вони зʼявляться списком на сторінці. Нижче можна додати пояснення текстом.
        </p>
      </div>

      <ChipGroup
        label="Що входить у вартість"
        presets={INCLUDED_PRESETS}
        selected={inc}
        disabled={disabled}
        tone="include"
        onToggle={(item) => onIncludedChange(toggleItem(inc, item))}
      />

      <ChipGroup
        label="Що не входить"
        presets={EXCLUDED_PRESETS}
        selected={exc}
        disabled={disabled}
        tone="exclude"
        onToggle={(item) => onExcludedChange(toggleItem(exc, item))}
      />

      <div className="space-y-1 border-t border-divider pt-5">
        <span className="block text-sm font-medium text-ink">Додаткові умови</span>
        <p className="mb-2 text-xs text-muted">Скасування, обмеження, що взяти з собою тощо</p>
        {notes}
      </div>
    </div>
  )
}
