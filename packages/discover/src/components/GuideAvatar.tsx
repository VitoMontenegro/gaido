import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { cn } from '@gaido/ui-primitives/cn'

export const GUIDE_DEFAULT_AVATAR = '/images/guide-default.svg'

export function guideAvatarSrc(avatar?: string | null) {
  const url = avatar?.trim()
  if (!url) return GUIDE_DEFAULT_AVATAR
  return resolveMediaUrl(url) || GUIDE_DEFAULT_AVATAR
}

type GuideAvatarProps = {
  avatar?: string | null
  name?: string
  className?: string
  imgClassName?: string
}

export default function GuideAvatar({ avatar, name, className, imgClassName }: GuideAvatarProps) {
  return (
    <div className={cn('overflow-hidden bg-sand-100', className)}>
      <img
        src={guideAvatarSrc(avatar)}
        alt={name ? `Фото: ${name}` : ''}
        className={cn('h-full w-full object-cover', imgClassName)}
        loading="lazy"
      />
    </div>
  )
}
