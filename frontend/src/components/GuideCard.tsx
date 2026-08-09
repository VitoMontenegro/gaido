import { Link } from 'react-router-dom'
import type { PublicGuide } from '../api/client'
import GuideAvatar from './GuideAvatar'
import { cn } from '../lib/cn'

export default function GuideCard({
  guide,
  compact,
  promoted,
}: {
  guide: PublicGuide
  compact?: boolean
  promoted?: boolean
}) {
  if (compact) {
    return (
      <Link
        to={`/guide/${guide.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="relative">
          <GuideAvatar
            avatar={guide.avatar_url}
            name={guide.display_name}
            className="aspect-[4/3] w-full"
          />
          {promoted && (
            <span className="absolute left-2 top-2 rounded-md bg-brand-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Топ
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-2.5">
          <p className="mt-0.5 line-clamp-2 text-sm font-medium normal-case leading-snug text-ink group-hover:text-brand-700">
            {guide.display_name}
          </p>
          {guide.type_badge && (
            <span className="mt-1 inline-flex w-fit rounded-md bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-dark">
              {guide.type_badge}
            </span>
          )}
          <p className="mt-auto pt-1.5 text-xs text-muted-light">
            ★ {guide.rating_avg.toFixed(1)}
            {guide.rating_count > 0 && ` · ${guide.rating_count}`}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="group card flex gap-4 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <GuideAvatar avatar={guide.avatar_url} name={guide.display_name} className="h-20 w-20 shrink-0 rounded-2xl" />
      <div className="min-w-0">
        <h3 className="font-display font-medium uppercase text-ink group-hover:text-brand-700">{guide.display_name}</h3>
        {guide.type_badge && <span className="badge-teal mt-2">{guide.type_badge}</span>}
        <p className="mt-2 line-clamp-2 text-sm text-muted">{guide.about || 'Місцевий експерт з авторськими маршрутами'}</p>
        <p className="mt-2 text-sm text-muted-light">
          ★ {guide.rating_avg.toFixed(1)} · {guide.rating_count} відгуків
        </p>
      </div>
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
