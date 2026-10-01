import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, resolveMediaUrl, type ArticleListItem } from '@gaido/api-client/api/client'
import { pageTitle } from '@gaido/site-urls/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import { Seo } from '../lib/seo'
import { sanitizeHtml } from '../lib/html'

const NEWS_HEADING = 'Новини'
const NEWS_DESCRIPTION = 'Новини для мандрівників — що варто знати перед поїздкою'

function formatNewsDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function NewsCard({ article }: { article: ArticleListItem }) {
  const cover = resolveMediaUrl(article.cover_image_url)
  return (
    <article className="journal-card group">
      <Link to={`/news/${article.slug}`} className="journal-card__link">
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
              {formatNewsDate(article.published_at)}
            </time>
          )}
          <h2 className="journal-card__title">{article.title}</h2>
          {article.excerpt && <p className="journal-card__excerpt">{article.excerpt}</p>}
          <span className="journal-card__more">Читати →</span>
        </div>
      </Link>
    </article>
  )
}

export function NewsListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['articles', 'news'],
    queryFn: () => articlesApi.list(20, 'news'),
  })
  const items = data?.items ?? []

  return (
    <>
      <Seo title={pageTitle(NEWS_HEADING)} description={NEWS_DESCRIPTION} path="/news" />
      <Breadcrumbs items={[{ label: 'Новини' }]} />
      <section className="border-b border-divider bg-surface">
        <div className="container-site py-10 md:py-14">
          <p className="section-title-sm mb-3">Новини</p>
          <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
            {NEWS_HEADING}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted">{NEWS_DESCRIPTION}</p>
        </div>
      </section>
      <section className="container-site py-10 md:py-14">
        {isLoading ? (
          <p className="text-muted">Завантаження...</p>
        ) : items.length === 0 ? (
          <p className="text-muted">Новин поки немає.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export function NewsArticlePage() {
  const { slug = '' } = useParams()
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', 'news', slug],
    queryFn: () => articlesApi.get(slug, 'news'),
    enabled: !!slug,
  })

  if (isLoading) return <div className="container-site py-10">Завантаження...</div>
  if (!article) {
    return (
      <>
        <Seo title={pageTitle('Новину не знайдено')} noIndex />
        <div className="container-site py-10">Новину не знайдено</div>
      </>
    )
  }

  const cover = resolveMediaUrl(article.cover_image_url)

  return (
    <>
      <Seo
        title={pageTitle(article.title)}
        description={article.excerpt || article.title}
        path={`/news/${article.slug}`}
        image={cover}
      />
      <Breadcrumbs items={[{ label: 'Новини', to: '/news' }, { label: article.title }]} />
      {cover && (
        <div className="border-b border-divider bg-sand-100">
          <img src={cover} alt="" className="aspect-[21/9] w-full max-h-[420px] object-cover" loading="lazy" />
        </div>
      )}
      <div className="container-site py-8 md:py-10">
        <article className="mx-auto max-w-3xl">
          {article.published_at && (
            <time className="text-sm text-muted" dateTime={article.published_at}>
              {formatNewsDate(article.published_at)}
            </time>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
            {article.title}
          </h1>
          {article.excerpt && <p className="mt-4 text-lg leading-relaxed text-muted">{article.excerpt}</p>}
          <div className="excursion-body mt-8" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body_html) }} />
          <div className="mt-10 border-t border-divider pt-8">
            <Link to="/news" className="link-accent text-sm normal-case">
              ← Усі новини
            </Link>
          </div>
        </article>
      </div>
    </>
  )
}
