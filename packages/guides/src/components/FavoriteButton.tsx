import type { MouseEvent } from 'react'
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'
import { cn } from '@gaido/ui-primitives/cn'
import { useFavorites } from '../hooks/useFavorites'

type FavoriteButtonProps = {
  targetType: string
  targetId: number
  variant?: 'icon' | 'button' | 'compact'
  className?: string
}

export default function FavoriteButton({
  targetType,
  targetId,
  variant = 'icon',
  className,
}: FavoriteButtonProps) {
  const { isFavorited, toggle, isPending } = useFavorites()
  if (!targetId) return null

  const favorited = isFavorited(targetType, targetId)
  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const onToggle = (e: MouseEvent) => {
    stop(e)
    toggle({ target_type: targetType, target_id: targetId })
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        className={cn('btn-secondary w-full', className)}
        disabled={isPending}
        aria-pressed={favorited}
        aria-label={favorited ? 'В обраному' : 'В обране'}
        onClick={onToggle}
      >
        {favorited ? 'В обраному' : 'В обране'}
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className={cn('btn-secondary shrink-0 px-3 py-2.5 text-sm', className)}
        disabled={isPending}
        aria-pressed={favorited}
        aria-label={favorited ? 'В обраному' : 'В обране'}
        onClick={onToggle}
      >
        {favorited ? '♥' : '♡'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-sm transition hover:bg-white',
        favorited && 'text-red-500',
        className,
      )}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Прибрати з обраного' : 'Додати в обране'}
      onClick={onToggle}
      onPointerDown={stop}
    >
      {favorited ? <HeartSolid className="h-5 w-5" /> : <HeartOutline className="h-5 w-5" />}
    </button>
  )
}
