import { type ComponentType, type ReactNode, type SVGProps } from 'react'
import {
  ClockIcon,
  FaceSmileIcon,
  LanguageIcon,
  LifebuoyIcon,
  MapIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import {
  formatDurationClock,
  formatGroupSize,
  languageLabel,
  transportLabel,
} from './excursionUi'

const iconClass = 'h-6 w-6'

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
      {children}
    </span>
  )
}

function transportIcon(mode: string) {
  const Icon: ComponentType<SVGProps<SVGSVGElement>> =
    mode === 'CAR' || mode === 'TRANSPORT' ? TruckIcon : mode === 'BOAT' ? LifebuoyIcon : MapIcon
  return <Icon className={iconClass} aria-hidden />
}

function DetailItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <IconWrap>{icon}</IconWrap>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-stone-900">{title}</p>
        {description ? (
          <div className="mt-0.5 text-xs leading-snug text-stone-500">{description}</div>
        ) : null}
      </div>
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
  onOpenAvailability?: () => void
}

export default function ExcursionDetailsGrid({
  type,
  maxGuests,
  durationMinutes,
  transportMode,
  language,
  childrenAllowed = true,
  onOpenAvailability,
}: Props) {
  return (
    <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
      <DetailItem
        icon={transportIcon(transportMode)}
        title={transportLabel(transportMode)}
      />
      <DetailItem
        icon={<ClockIcon className={iconClass} aria-hidden />}
        title={formatDurationClock(durationMinutes) || '—'}
        description={
          <>
            <span className="block text-stone-500">Тривалість</span>
            {onOpenAvailability ? (
              <button
                type="button"
                className="text-left text-xs text-stone-500 underline-offset-2 hover:underline"
                onClick={onOpenAvailability}
              >
                Перевірте доступність, щоб побачити час початку
              </button>
            ) : null}
          </>
        }
      />
      {childrenAllowed !== false && (
        <DetailItem
          icon={<FaceSmileIcon className={iconClass} aria-hidden />}
          title="Можна з дітьми"
        />
      )}
      <DetailItem
        icon={<LanguageIcon className={iconClass} aria-hidden />}
        title="Екскурсовод"
        description={languageLabel(language)}
      />
      <DetailItem
        icon={<UserGroupIcon className={iconClass} aria-hidden />}
        title={formatGroupSize(type, maxGuests)}
      />
    </div>
  )
}
