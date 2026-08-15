import { cn } from '../../lib/cn'

type Props = {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (value: number) => void
  className?: string
  ariaLabel?: string
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      strokeLinejoin="round"
    >
      <path d="M9.36816 0.557222C9.73497 -0.186024 10.7948 -0.186026 11.1616 0.55722L13.5589 5.41469C13.7046 5.70983 13.9862 5.9144 14.3119 5.96173L19.6724 6.74066C20.4926 6.85985 20.8201 7.86782 20.2266 8.44636L16.3477 12.2274C16.112 12.4571 16.0045 12.7881 16.0601 13.1125L16.9758 18.4514C17.1159 19.2683 16.2585 19.8912 15.5248 19.5056L10.7302 16.9849C10.4389 16.8317 10.0909 16.8317 9.79955 16.9849L5.00494 19.5056C4.27132 19.8912 3.41388 19.2683 3.55399 18.4514L4.46968 13.1125C4.52532 12.7881 4.41777 12.4571 4.18209 12.2274L0.303165 8.44636C-0.290352 7.86782 0.0371574 6.85985 0.857378 6.74066L6.21791 5.96173C6.54362 5.9144 6.82519 5.70983 6.97085 5.41469L9.36816 0.557222Z"></path>
    </svg>
  )
}

export default function StarRating({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
  ariaLabel,
}: Props) {
  const clamped = Math.max(0, Math.min(max, value))
  const fullStars = Math.floor(clamped)
  const hasHalf = clamped - fullStars >= 0.25 && clamped - fullStars < 0.75
  const roundUp = clamped - fullStars >= 0.75
  const displayFull = fullStars + (roundUp ? 1 : 0)

  const filledClass = 'text-[#ffe72f]'
  const emptyClass = 'text-[#e5dcdc]'

  if (interactive && onChange) {
    return (
      <div
        className={cn('inline-flex items-center', className)}
        role="radiogroup"
        aria-label={ariaLabel ?? 'Оцінка'}
      >
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1
          const filled = star <= value
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              className="rounded-sm p-0.5 transition-colors hover:text-[#ffb400] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => onChange(star)}
            >
              <StarIcon
                filled={filled}
                className={cn(sizes[size], filled ? filledClass : emptyClass)}
              />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={ariaLabel ?? `Оцінка ${clamped.toFixed(1)} з ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1
        const filled = star <= displayFull
        if (!filled && hasHalf && star === displayFull + 1) {
          return (
            <span key={star} className={cn('relative inline-block shrink-0', sizes[size])}>
              <StarIcon filled={false} className={cn(sizes[size], emptyClass)} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <StarIcon filled className={cn(sizes[size], filledClass)} />
              </span>
            </span>
          )
        }
        return (
          <StarIcon
            key={star}
            filled={filled}
            className={cn(sizes[size], 'shrink-0', filled ? filledClass : emptyClass)}
          />
        )
      })}
    </span>
  )
}
