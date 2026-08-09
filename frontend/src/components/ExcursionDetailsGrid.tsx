import type { ReactNode } from 'react'
import {
  formatDuration,
  formatGroupSize,
  languageLabel,
  transportLabel,
} from './excursionUi'

function IconWalk() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M10 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM8.2 6.5h3.6l.9 4.2 1.7 2.4-.9.7-1.5-2.1-.4 1.7 2.2 3.4-.9.6-2.4-3.6-1.1 3.6H7l1.3-4.3-.6-2.9H6.2l-.5-1.7h2.5Z"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM9.25 5.5v4.3l2.9 2.9.1-.1.95-.95-2.45-2.45V5.5H9.25Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function IconKids() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M10 3.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6ZM6.2 9.2h7.6c.7 0 1.2.6 1.1 1.3l-.7 5.2A1.2 1.2 0 0 1 13 16.8H7a1.2 1.2 0 0 1-1.2-1.1l-.7-5.2c-.1-.7.4-1.3 1.1-1.3Z"
      />
    </svg>
  )
}

function IconLang() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M3.5 4.2h7.2v1.6H8.3c-.3 1.4-.9 2.7-1.8 3.7.7.5 1.5 1 2.4 1.3l-.6 1.5a8 8 0 0 1-3-1.7A8.4 8.4 0 0 1 2.7 12l-1.5-.4c.7-1.4 1.7-2.6 2.9-3.5-.5-.6-.9-1.3-1.2-2H2v-1.9h1.5Zm4.2 1.6H5.3c.2.6.5 1.2.9 1.7.5-.5.8-1.1 1-1.7Zm4.8-.2h5v1.6h-1.6l-2.6 7.3h-1.8l2.6-7.3h-1.6V5.6Z"
      />
    </svg>
  )
}

function IconGroup() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M10 2.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM5.2 4.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm9.6 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM3.4 10.2c1.1-.5 2.4-.8 3.7-.8.4 0 .8 0 1.1.1A3.7 3.7 0 0 0 7 11.8v4.4H3.8A1.4 1.4 0 0 1 2.4 14.8c0-2.1.4-3.6 1-4.6Zm13.2 0c.6 1 1 2.5 1 4.6a1.4 1.4 0 0 1-1.4 1.4H13v-4.4c0-.8-.3-1.5-.7-2.1.4-.1.8-.1 1.2-.1 1.3 0 2.6.3 3.7.8ZM10 9.2c1.8 0 4.2.8 4.2 3.4v3.6H5.8v-3.6c0-2.6 2.4-3.4 4.2-3.4Z"
      />
    </svg>
  )
}

function DetailItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 shrink-0 text-stone-900">{icon}</span>
      <p className="text-[15px] leading-snug text-stone-800">{children}</p>
    </div>
  )
}

type Props = {
  type: string
  maxGuests: number
  durationMinutes: number
  transportMode: string
  language: string
  childrenAllowed?: boolean
}

export default function ExcursionDetailsGrid({
  type,
  maxGuests,
  durationMinutes,
  transportMode,
  language,
  childrenAllowed = true,
}: Props) {
  return (
    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
      <div>
        <DetailItem icon={<IconWalk />}>{transportLabel(transportMode)}</DetailItem>
        <DetailItem icon={<IconClock />}>{formatDuration(durationMinutes)}</DetailItem>
        {childrenAllowed !== false && (
          <DetailItem icon={<IconKids />}>Можна з дітьми</DetailItem>
        )}
      </div>
      <div>
        <DetailItem icon={<IconLang />}>{languageLabel(language)}</DetailItem>
        <DetailItem icon={<IconGroup />}>{formatGroupSize(type, maxGuests)}</DetailItem>
      </div>
    </div>
  )
}
