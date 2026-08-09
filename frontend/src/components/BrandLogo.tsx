import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_TAGLINE } from '../lib/brand'
import { cn } from '../lib/cn'

type Props = {
  className?: string
  variant?: 'default' | 'inverse' | 'hero'
  showTagline?: boolean
  asLink?: boolean
  compact?: boolean
}

function BrandMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill={inverse ? '#ffffff' : '#060606'} />
      <path
        d="M27.2 13.4C22.1 10.8 15.8 12.6 13.8 18.2c-1.6 4.8 1.1 10 6.9 11.1 3.6.7 6.7-.6 8.3-3.2"
        stroke="#FB7036"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21.8 22.6H28.4" stroke="#FB7036" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="28.6" cy="12.8" r="3.25" fill="#2CB2AB" />
      <circle cx="28.6" cy="12.8" r="1.15" fill={inverse ? '#060606' : '#fff'} />
    </svg>
  )
}

export default function BrandLogo({
  className,
  variant = 'default',
  showTagline = false,
  asLink = true,
  compact = false,
}: Props) {
  const inverse = variant === 'inverse' || variant === 'hero'
  const markSize = compact
    ? 'h-8 w-8'
    : variant === 'hero'
      ? 'h-10 w-10 md:h-11 md:w-11'
      : 'h-9 w-9'
  const nameClass = compact
    ? 'font-display text-base font-bold normal-case tracking-tight text-ink'
    : variant === 'hero'
      ? 'font-display text-lg font-bold normal-case tracking-tight text-white md:text-xl'
      : variant === 'inverse'
        ? 'font-display text-xl font-bold normal-case tracking-tight text-white md:text-2xl'
        : 'font-display text-xl font-bold normal-case tracking-tight text-ink md:text-2xl'

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark className={markSize} inverse={inverse} />
      <span className="min-w-0">
        <span className={nameClass}>{SITE_NAME}</span>
        {showTagline && (
          <span
            className={cn(
              'mt-0.5 block text-sm leading-snug',
              inverse ? 'text-white/75' : 'text-muted',
            )}
          >
            {SITE_TAGLINE}
          </span>
        )}
      </span>
    </span>
  )

  if (!asLink) return content

  return (
    <Link to="/" className="shrink-0 transition hover:opacity-80">
      {content}
    </Link>
  )
}
