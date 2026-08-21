import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { cn } from '@gaido/ui-primitives/cn'

const INITIAL_AVATAR_BG = '#2cb2ab'

function userInitial(name?: string): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  return [...trimmed][0]?.toUpperCase() ?? '?'
}

function initialAvatarSrc(letter: string): string {
  const safe = letter.replace(/[<>&"']/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96">` +
    `<rect width="24" height="24" fill="${INITIAL_AVATAR_BG}"/>` +
    `<text fill="#f9f9f9" font-size="12" font-family="sans-serif" x="12" y="12" dominant-baseline="middle" text-anchor="middle">${safe}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function userAvatarSrc(avatar?: string | null, name?: string): string {
  const url = avatar?.trim()
  if (url) {
    const resolved = resolveMediaUrl(url)
    if (resolved) return resolved
  }
  return initialAvatarSrc(userInitial(name))
}

type UserAvatarProps = {
  avatar?: string | null
  name?: string
  className?: string
  alt?: string
}

export default function UserAvatar({ avatar, name, className, alt }: UserAvatarProps) {
  const label = alt ?? (name ? `Профіль: ${name}` : 'Профіль')
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-full bg-sand-100', className)}>
      <img
        src={userAvatarSrc(avatar, name)}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
    </div>
  )
}
