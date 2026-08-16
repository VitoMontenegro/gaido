import { Link } from 'react-router-dom'
import GuideAvatar from './GuideAvatar'
import type { ArticleAuthor } from '@gaido/api-client/api/articles'
import { cn } from '@gaido/ui-primitives/cn'

type Props = {
  author?: ArticleAuthor | null
  className?: string
  compact?: boolean
}

export default function ArticleAuthorByline({ author, className, compact }: Props) {
  if (!author?.display_name) return null

  const inner = (
    <>
      <GuideAvatar
        avatar={author.avatar_url}
        name={author.display_name}
        className={compact ? 'h-8 w-8 rounded-full' : 'h-12 w-12 rounded-2xl shadow-sm'}
      />
      <span className="min-w-0">
        <span className={cn('block font-medium text-ink', compact ? 'text-xs' : 'text-sm')}>
          {author.display_name}
        </span>
        {!compact && (
          <span className="mt-0.5 block text-xs text-muted">
            {author.guide_slug ? 'Гід · автор статті' : 'Автор статті'}
          </span>
        )}
      </span>
    </>
  )

  const cls = cn(
    'article-byline',
    compact && 'article-byline--compact',
    className,
  )

  if (author.guide_slug) {
    return (
      <Link to={`/guide/${author.guide_slug}`} className={cls} onClick={(e) => e.stopPropagation()}>
        {inner}
      </Link>
    )
  }

  return <div className={cls}>{inner}</div>
}
