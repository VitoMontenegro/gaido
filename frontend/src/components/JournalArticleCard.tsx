import { Link } from 'react-router-dom'
import { resolveMediaUrl, type ArticleListItem } from '../api/client'
import ArticleAuthorByline from './ArticleAuthorByline'

function formatArticleDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function JournalArticleCard({
  article,
  heading = 'h2',
}: {
  article: ArticleListItem
  heading?: 'h2' | 'h3'
}) {
  const cover = resolveMediaUrl(article.cover_image_url)
  const TitleTag = heading
  return (
    <article className="journal-card group">
      <Link to={`/journal/${article.slug}`} className="journal-card__link">
        <div className="journal-card__media">
          {cover ? (
            <img src={cover} alt="" className="journal-card__img" loading="lazy" />
          ) : (
            <div className="journal-card__placeholder" />
          )}
        </div>
        <div className="journal-card__body">
          {article.published_at && (
            <time className="journal-card__date" dateTime={article.published_at}>
              {formatArticleDate(article.published_at)}
            </time>
          )}
          <TitleTag className="journal-card__title">{article.title}</TitleTag>
          {article.excerpt && <p className="journal-card__excerpt">{article.excerpt}</p>}
          <span className="journal-card__more">Читати →</span>
        </div>
      </Link>
      {article.author && (
        <div className="journal-card__author">
          <ArticleAuthorByline author={article.author} compact />
        </div>
      )}
    </article>
  )
}

export { formatArticleDate }
