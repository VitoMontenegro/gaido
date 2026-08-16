import { Link } from 'react-router-dom'
import type { Contacts } from '@gaido/api-client/api/types/catalog'
import GuideAvatar from './GuideAvatar'
import GuideContactPills, { guideContactLinks } from './GuideContactPills'
import StarRating from './reviews/StarRating'

type Props = {
  open: boolean
  onClose: () => void
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

export default function GuideContactSheet({
  open,
  onClose,
  guideName,
  guideSlug,
  guideAvatarUrl,
  guideAbout,
  guideRatingAvg = 0,
  guideRatingCount = 0,
  contacts,
}: Props) {
  if (!open || !guideSlug || !guideName) return null

  const links = contacts ? guideContactLinks(contacts) : []
  const aboutLine = organizerAbout(guideAbout)
  const profileHref = `/guide/${guideSlug}`
  const emptyContactsMessage =
    contacts?.visible === false
      ? 'Контакти доступні після активації розміщення гіда.'
      : 'Гід поки не додав контакти для звʼязку.'

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="guide-contact-title">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Закрити"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-divider" aria-hidden />
        <div className="flex items-start gap-4">
          <GuideAvatar avatar={guideAvatarUrl} name={guideName} className="h-16 w-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h2 id="guide-contact-title" className="font-display text-lg font-medium uppercase text-ink">
              {guideName}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-stone-600">
              <StarRating value={guideRatingCount > 0 ? guideRatingAvg : 0} size="sm" />
              <span>
                {guideRatingCount > 0
                  ? `${guideRatingAvg.toFixed(1)} · ${guideRatingCount} відгуків`
                  : 'Ще немає відгуків'}
              </span>
            </p>
            {aboutLine ? (
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{aboutLine}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {links.length > 0 ? (
            <GuideContactPills links={links} />
          ) : (
            <p className="text-sm text-stone-500">{emptyContactsMessage}</p>
          )}
          {contacts?.response_hours && (
            <p className="text-sm text-stone-600">{contacts.response_hours}</p>
          )}
          <Link to={profileHref} className="inline-block text-sm font-medium text-teal" onClick={onClose}>
            Профіль гіда →
          </Link>
        </div>
      </div>
    </div>
  )
}
