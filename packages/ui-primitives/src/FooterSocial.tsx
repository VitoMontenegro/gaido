import { SOCIAL_FACEBOOK_URL, SOCIAL_INSTAGRAM_URL } from '@gaido/site-urls/social'
import { cn } from './cn'

const LINKS = [
  { href: SOCIAL_INSTAGRAM_URL, label: 'Instagram', Icon: InstagramIcon },
  { href: SOCIAL_FACEBOOK_URL, label: 'Facebook', Icon: FacebookIcon },
] as const

export default function FooterSocial({ className }: { className?: string }) {
  return (
    <nav aria-label="Соцмережі" className={cn('flex items-center gap-2', className)}>
      {LINKS.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-divider text-ink transition hover:bg-sand-100"
        >
          <Icon />
        </a>
      ))}
    </nav>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M14.2 21v-6.6h2.2l.3-2.6h-2.5V10c0-.8.2-1.3 1.4-1.3h1.2V6.3c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.3H9.3v2.6h2.4V21h2.5z" />
    </svg>
  )
}
