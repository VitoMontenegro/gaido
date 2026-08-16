import { Link } from 'react-router-dom'
import type { Contacts } from '@gaido/api-client/api/types/catalog'
import GuideAvatar from './GuideAvatar'
import GuideContactPills, { guideContactLinks } from './GuideContactPills'
import StarRating from './reviews/StarRating'

type Props = {
  guideName?: string
  guideSlug?: string
  guideAvatarUrl?: string
  guideAbout?: string
  guideRatingAvg?: number
  guideRatingCount?: number
  contacts?: Contacts
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
    <section className="excursion-parus-section min-w-0 overflow-hidden p-4 shadow-lg">
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
            <GuideContactPills links={links} />
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
          <GuideContactPills links={links} />
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
