import { Link } from 'react-router-dom'
import type { Contacts } from '../api/types/catalog'
import GuideAvatar from './GuideAvatar'
import StarRating from './reviews/StarRating'
import { guideContactLinks, type GuideContactLink } from '../lib/guideContactLinks'

type Props = {
  guideName?: string
  guideSlug?: string
  guideAvatarUrl?: string
  guideAbout?: string
  guideRatingAvg?: number
  guideRatingCount?: number
  contacts?: Contacts
}

function pillLabel(link: GuideContactLink) {
  if (link.key === 'email') return 'E-Mail'
  return link.label
}

function ContactIcon({ kind }: { kind: GuideContactLink['key'] }) {
  const common = 'h-6 w-6 shrink-0'
  switch (kind) {
    case 'telegram':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.0006 22.7145L11.4713 22.7008C6.21183 22.4344 1.99484 18.2179 1.72803 12.9586L1.71436 12.4293C1.71436 6.74859 6.31988 2.14307 12.0006 2.14307L12.5299 2.15674C17.9644 2.43244 22.2858 6.92625 22.2858 12.4293L22.2721 12.9586C21.9964 18.3929 17.5034 22.7143 12.0006 22.7145ZM12.0006 3.74269C16.7974 3.74291 20.6862 7.63239 20.6862 12.4293C20.6859 17.226 16.7972 21.1146 12.0006 21.1149C7.20368 21.1149 3.3142 17.2261 3.31398 12.4293C3.31398 7.63225 7.20354 3.74269 12.0006 3.74269Z"
            fill="currentColor"
          />
          <path
            d="M17.1399 8.95027C16.9856 10.6066 16.3172 14.6322 15.9778 16.4877C15.8338 17.2739 15.5459 17.536 15.2785 17.5675C14.682 17.6199 14.2295 17.1691 13.6536 16.7812C12.7486 16.1732 12.2344 15.7958 11.3603 15.2087C10.3422 14.5273 11.0004 14.1499 11.5865 13.5419C11.7408 13.3847 14.3735 10.9421 14.4249 10.7219C14.4321 10.6886 14.4311 10.654 14.4222 10.6211C14.4132 10.5882 14.3965 10.558 14.3735 10.5332C14.3118 10.4808 14.2295 10.5018 14.1575 10.5123C14.065 10.5332 12.6252 11.5082 9.8177 13.4371C9.40634 13.7201 9.03612 13.8669 8.70703 13.8564C8.33681 13.8459 7.6375 13.6467 7.11302 13.4685C6.46513 13.2589 5.96121 13.1436 6.00235 12.7766C6.02292 12.5879 6.28002 12.3992 6.76336 12.2001C9.76628 10.8687 11.7614 9.98811 12.7589 9.56878C15.6179 8.35273 16.204 8.14307 16.5948 8.14307C16.6771 8.14307 16.8725 8.16403 16.9959 8.26886C17.0988 8.35273 17.1296 8.46805 17.1399 8.55191C17.1296 8.61481 17.1502 8.80351 17.1399 8.95027Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'email':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12.7204 2.03036C11.2898 1.92605 9.85351 2.13104 8.50923 2.63137C7.16494 3.1317 5.94417 3.91565 4.92991 4.92991C3.91565 5.94417 3.1317 7.16494 2.63137 8.50923C2.13104 9.85351 1.92605 11.2898 2.03036 12.7204C2.39036 18.0104 7.01035 22.0004 12.3104 22.0004H16.0004C16.5504 22.0004 17.0004 21.5504 17.0004 21.0004C17.0004 20.4504 16.5504 20.0004 16.0004 20.0004H12.3304C8.60035 20.0004 5.18036 17.5804 4.25036 13.9704C2.76035 8.17035 8.16035 2.76036 13.9604 4.26036C17.5804 5.18036 20.0004 8.60035 20.0004 12.3304V13.4304C20.0004 14.2204 19.2904 15.0004 18.5004 15.0004C17.7104 15.0004 17.0004 14.2204 17.0004 13.4304V12.1804C17.0004 9.67035 15.2204 7.41036 12.7404 7.06036C11.9513 6.94303 11.1457 7.01589 10.3905 7.27287C9.63528 7.52986 8.9524 7.96352 8.3987 8.53777C7.84499 9.11202 7.43647 9.81024 7.20716 10.5743C6.97785 11.3383 6.93437 12.1461 7.08036 12.9304C7.25621 13.8751 7.70061 14.7492 8.36035 15.448C9.02009 16.1467 9.86723 16.6406 10.8004 16.8704C12.6404 17.3004 14.3904 16.7104 15.5404 15.5404C16.4304 16.7604 18.2104 17.4004 19.8404 16.7504C21.1804 16.2204 22.0004 14.8504 22.0004 13.4104V12.3204C22.0004 7.01035 18.0104 2.39036 12.7204 2.03036ZM12.0004 15.0004C10.3404 15.0004 9.00036 13.6604 9.00036 12.0004C9.00036 10.3404 10.3404 9.00036 12.0004 9.00036C13.6604 9.00036 15.0004 10.3404 15.0004 12.0004C15.0004 13.6604 13.6604 15.0004 12.0004 15.0004Z"
            fill="#0072CF"
          />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      )
    case 'viber':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.528 6.471.377 9.898c-.001.06-.002.12-.002.18v.01c0 .06.001.12.002.18.15 3.427.917 5.72 2.637 7.431 2.317 2.123 6.459 2.439 8.384 2.465h.002c.06 0 .12-.001.18-.002.06-.001.12-.002.18-.002h.01c.06 0 .12.001.18.002.06.001.12.002.18.002h.002c1.925-.026 6.067-.342 8.384-2.465 1.72-1.71 2.487-4.004 2.637-7.431.001-.06.002-.12.002-.18v-.01c0-.06-.001-.12-.002-.18-.151-3.427-.917-5.721-2.637-7.431C17.669.344 13.527.028 11.602.002h-.204zm.096 1.996h.012c1.674.022 5.416.308 7.354 2.082 1.454 1.333 2.09 3.28 2.224 6.312v.008c-.134 3.032-.77 4.979-2.224 6.312-1.938 1.774-5.68 2.06-7.354 2.082h-.012c-1.674-.022-5.416-.308-7.354-2.082-1.454-1.333-2.09-3.28-2.224-6.312v-.008c.134-3.032.77-4.979 2.224-6.312 1.938-1.774 5.68-2.06 7.354-2.082zm-.35 3.5c-.276 0-.5.224-.5.5v.002c0 .276.224.5.5.5.828 0 1.5.672 1.5 1.5v5.496c0 .276.224.5.5.5h.002c.276 0 .5-.224.5-.5V7.998c0-1.38-1.12-2.5-2.502-2.5zm-3 2c-.276 0-.5.224-.5.5v.002c0 .276.224.5.5.5.552 0 1 .448 1 1v3.496c0 .276.224.5.5.5h.002c.276 0 .5-.224.5-.5V9.998c0-1.104-.896-2-2-2zm6 0c-1.104 0-2 .896-2 2v3.496c0 .276.224.5.5.5h.002c.276 0 .5-.224.5-.5V9.998c0-.552.448-1 1-1 .276 0 .5-.224.5-.5v-.002c0-.276-.224-.5-.5-.5z" />
        </svg>
      )
  }
}

function ContactPills({ links }: { links: GuideContactLink[] }) {
  if (links.length === 0) return null

  return (
    <div className="excursion-parus-organizer__contacts">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target={link.key === 'email' ? undefined : '_blank'}
          rel={link.key === 'email' ? undefined : 'noopener noreferrer'}
          className={`excursion-parus-organizer__pill excursion-parus-organizer__pill--${link.key}`}
        >
          <ContactIcon kind={link.key} />
          <span>{pillLabel(link)}</span>
        </a>
      ))}
    </div>
  )
}

function organizerAbout(about?: string) {
  const line = about?.trim().split('\n').find(Boolean)?.trim()
  return line ?? ''
}

function OrganizerRating({ avg, count }: { avg: number; count: number }) {
  return (
    <p className="excursion-parus-organizer__rating">
      <StarRating value={count > 0 ? avg : 0} size="md" />
      <span>
        {count > 0 ? `${avg.toFixed(1)} · ${count} відгуків` : 'Ще немає відгуків'}
      </span>
    </p>
  )
}

export default function ExcursionOrganizerSection({
  guideName,
  guideSlug,
  guideAvatarUrl,
  guideAbout,
  guideRatingAvg,
  guideRatingCount,
  contacts,
}: Props) {
  if (!guideSlug || !guideName) return null

  const links = contacts ? guideContactLinks(contacts) : []
  const profileHref = `/guide/${guideSlug}`
  const aboutLine = organizerAbout(guideAbout)
  const ratingAvg = guideRatingAvg ?? 0
  const ratingCount = guideRatingCount ?? 0

  const emptyContactsMessage =
    contacts?.visible === false
      ? 'Контакти доступні після активації розміщення гіда.'
      : 'Гід поки не додав контакти для звʼязку.'

  return (
    <section className="excursion-parus-section min-w-0 overflow-hidden shadow-lg p-4">
      <div className="excursion-parus-organizer">
        <Link to={profileHref} className="excursion-parus-organizer__photo-link">
          <GuideAvatar
            avatar={guideAvatarUrl}
            name={guideName}
            className="excursion-parus-organizer__photo"
          />
        </Link>

        <div className="excursion-parus-organizer__desktop hidden min-w-0 flex-1 flex-col gap-6 sm:flex">
          <div className="excursion-parus-organizer__heading">Автор екскурсії</div>
          <div className="flex flex-col gap-2">
            <Link to={profileHref} className="excursion-parus-organizer__name">
              {guideName}
            </Link>
            <OrganizerRating avg={ratingAvg} count={ratingCount} />
            {aboutLine ? (
              <p className="excursion-parus-organizer__about">{aboutLine}</p>
            ) : (
              <Link to={profileHref} className="excursion-parus-organizer__about-link">
                Профіль гіда →
              </Link>
            )}
          </div>
          {links.length > 0 ? (
            <ContactPills links={links} />
          ) : (
            <p className="excursion-parus-organizer__empty">{emptyContactsMessage}</p>
          )}
          {contacts?.response_hours && (
            <p className="text-sm text-stone-600">{contacts.response_hours}</p>
          )}
        </div>

        <div className="excursion-parus-organizer__mobile flex min-w-0 flex-1 flex-col gap-2 sm:hidden">
          <Link to={profileHref} className="excursion-parus-organizer__name-mobile">
            {guideName}
          </Link>
          <OrganizerRating avg={ratingAvg} count={ratingCount} />
          {aboutLine ? (
            <p className="excursion-parus-organizer__about-mobile">{aboutLine}</p>
          ) : (
            <Link to={profileHref} className="excursion-parus-organizer__about-link-mobile">
              Профіль гіда →
            </Link>
          )}
        </div>
      </div>

      {links.length > 0 && (
        <div className="mt-4 sm:hidden">
          <ContactPills links={links} />
        </div>
      )}
      {contacts?.response_hours && (
        <p className="mt-3 text-sm text-stone-600 sm:hidden">{contacts.response_hours}</p>
      )}
      {links.length === 0 && (
        <p className="excursion-parus-organizer__empty mt-4 sm:hidden">{emptyContactsMessage}</p>
      )}
    </section>
  )
}
