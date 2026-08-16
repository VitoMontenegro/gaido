import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_TAGLINE } from '../lib/brand'
import { cn } from '../lib/cn'

const LOGO = {
  light: '/images/white_logo.png',
  dark: '/images/black_logo.png',
} as const

type Props = {
  className?: string
  variant?: 'default' | 'inverse' | 'hero'
  showTagline?: boolean
  asLink?: boolean
  compact?: boolean
  homeTo?: string
  /** Компактний розмір на мобільних, повний — від md (для хедера). */
  compactOnMobile?: boolean
}

function BrandMark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <img
      src={dark ? LOGO.dark : LOGO.light}
      alt=""
      className={cn('shrink-0 object-contain', className)}
      aria-hidden
    />
  )
}

export default function BrandLogo({
  className,
  variant = 'default',
  showTagline = false,
  asLink = true,
  compact = false,
  compactOnMobile = false,
  homeTo = '/',
}: Props) {
  const dark = variant === 'inverse' || variant === 'hero'
  const markSize = compactOnMobile
    ? 'h-8 w-8 md:h-9 md:w-9'
    : compact
      ? 'h-8 w-8'
      : variant === 'hero'
        ? 'h-10 w-10 md:h-11 md:w-11'
        : 'h-9 w-9'
  const nameClass = compactOnMobile
    ? 'font-display text-base font-bold normal-case tracking-tight text-ink md:text-2xl'
    : compact
      ? 'font-display text-base font-bold normal-case tracking-tight text-ink'
      : variant === 'hero'
        ? 'font-display text-lg font-bold normal-case tracking-tight text-white md:text-xl'
        : variant === 'inverse'
          ? 'font-display text-xl font-bold normal-case tracking-tight text-white md:text-2xl'
          : 'font-display text-xl font-bold normal-case tracking-tight text-ink md:text-2xl'

  const rootClass = cn(
    'inline-flex shrink-0 items-center gap-2.5',
    asLink && 'transition hover:opacity-80',
    className,
  )

  const body = (
    <>
      <BrandMark className={markSize} dark={dark} />
      <span className="min-w-0">
        <span className={nameClass}>{SITE_NAME}</span>
        {showTagline && (
          <span
            className={cn(
              'mt-0.5 block text-sm leading-snug',
              dark ? 'text-white/75' : 'text-muted',
            )}
          >
            {SITE_TAGLINE}
          </span>
        )}
      </span>
    </>
  )

  if (!asLink) {
    return <span className={rootClass}>{body}</span>
  }

  return (
    <Link to={homeTo} className={rootClass}>
      {body}
    </Link>
  )
}
