import { Link } from 'react-router-dom'
import { resolveMediaUrl, type ArticleListItem } from '@gaido/api-client/api/client'
import GuideAvatar from './GuideAvatar'

function formatArticleDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatArticleDateShort(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Компактна картка статті: уся картка — одне посилання (без вкладених <a>),
 * заголовок і анонс обрізані кількома рядками, автор і дата — в одному рядку внизу.
 */
export default function JournalArticleCard({
  article,
  heading = 'h2',
  priority = false,
}: {
  article: ArticleListItem
  heading?: 'h2' | 'h3'
  priority?: boolean
}) {
  const cover = resolveMediaUrl(article.cover_image_url)
  const TitleTag = heading
  const href = `/journal/${article.slug}`
  return (
    <article className="journal-card group">
      <Link to={href} className="journal-card__link">
        <div className="journal-card__media">
          {cover ? (
            <img
              src={cover}
              alt={article.title}
              className="journal-card__img"
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              width={480}
              height={300}
            />
          ) : (
            <div className="journal-card__placeholder" />
          )}
        </div>
        <div className="journal-card__body">
          <TitleTag className="journal-card__title">{article.title}</TitleTag>
          {article.excerpt && <p className="journal-card__excerpt">{article.excerpt}</p>}
        </div>
        <div className="journal-card__footer">
          {article.author?.display_name ? (
            <div className="journal-card__author-name">
              <GuideAvatar
                avatar={article.author.avatar_url}
                name={article.author.display_name}
                className="h-6 w-6 shrink-0 rounded-full"
              />
              <span className="truncate">{article.author.display_name}</span>
            </div>
          ) : (
            <span />
          )}
          {article.published_at && (
            <time className="journal-card__date" dateTime={article.published_at}>
              {formatArticleDateShort(article.published_at)}
            </time>
          )}
        </div>
      </Link>
    </article>
  )
}

export { formatArticleDate }
