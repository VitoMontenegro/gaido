import { Link } from 'react-router-dom'
import type { PublicGuide } from '@gaido/api-client/api/client'
import GuideAvatar from './GuideAvatar'
import { displayGuideAbout } from '../lib/guideAbout'
import { guideCardLinked } from '../lib/rankGuides'
import { cn } from '@gaido/ui-primitives/cn'

export default function GuideCard({
  guide,
  compact,
  promoted,
  alwaysLink,
}: {
  guide: PublicGuide
  compact?: boolean
  promoted?: boolean
  /** Keep the profile link even when the guide has no published excursions. Used on /guides. */
  alwaysLink?: boolean
}) {
  const linked = guideCardLinked(guide, alwaysLink)
  if (compact) {
    const className = cn(
      'flex h-full flex-col overflow-hidden rounded-2xl bg-surface',
      linked
        ? 'group transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
        : 'opacity-50',
    )
    const body = (
      <>
        <div className="relative">
          <GuideAvatar
            avatar={guide.avatar_url}
            name={guide.display_name}
            className="aspect-[4/3] w-full"
          />
          {promoted && (
            <span className="absolute left-2 top-2 rounded-md badge-teal px-1.5 py-0.5 text-[10px] font-medium text-white">
              Топ
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-2.5">
          {guide.city_name && (
            <p className="line-clamp-1 text-xs text-muted-light">{guide.city_name}</p>
          )}
          <h3 className={cn(
            'mt-0.5 line-clamp-2 font-semibold normal-case leading-snug text-ink',
            linked && 'group-hover:text-teal',
          )}>
            {guide.display_name}
          </h3>
          {guide.type_badge && (
            <span className="mt-1 inline-flex w-fit rounded-md bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-dark">
              {guide.type_badge}
            </span>
          )}
          <p className="mt-auto pt-1.5 text-xs text-muted-light">
            <span className="text-[#ffe72f]" aria-hidden="true">★</span> {guide.rating_avg.toFixed(1)}
            {guide.rating_count > 0 && ` · ${guide.rating_count}`}
          </p>
        </div>
      </>
    )
    if (!linked) return <div className={className}>{body}</div>
    return (
      <Link to={`/guide/${guide.slug}`} className={className}>
        {body}
      </Link>
    )
  }

  const className = cn(
    'card flex gap-4',
    linked
      ? 'group transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
      : 'opacity-50',
  )
  const body = (
    <>
      <GuideAvatar avatar={guide.avatar_url} name={guide.display_name} className="h-20 w-20 shrink-0 rounded-2xl" />
      <div className="min-w-0">
        <h3 className={cn(
          'font-display font-medium uppercase text-ink',
          linked && 'group-hover:text-brand-700',
        )}>
          {guide.display_name}
        </h3>
        {guide.city_name && <p className="mt-1 text-sm text-muted-light">{guide.city_name}</p>}
        {guide.type_badge && <span className="badge-teal mt-2">{guide.type_badge}</span>}
        <p className="mt-2 line-clamp-2 text-sm text-muted">{displayGuideAbout(guide.about) || 'Місцевий експерт з авторськими маршрутами'}</p>
        <p className="mt-2 text-sm text-muted-light">
          <span className="text-[#ffe72f]" aria-hidden="true">★</span> {guide.rating_avg.toFixed(1)} · {guide.rating_count} відгуків
        </p>
      </div>
    </>
  )
  if (!linked) return <div className={className}>{body}</div>
  return (
    <Link to={`/guide/${guide.slug}`} className={className}>
      {body}
    </Link>
  )
}

export function GuideCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {children}
    </div>
  )
}
