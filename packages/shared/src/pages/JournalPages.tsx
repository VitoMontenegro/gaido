import { Seo } from '../lib/seo'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, resolveMediaUrl } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ArticleAuthorByline from '../components/ArticleAuthorByline'
import JournalArticleCard, { formatArticleDate } from '../components/JournalArticleCard'
import { pageTitle } from '../lib/brand'
import { sanitizeHtml } from '../lib/html'

export function JournalListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesApi.list(),
  })
  const items = data?.items ?? []

  return (
    <>
      <Seo
        title={pageTitle('Журнал')}
        description="Поради мандрівникам: як обрати гіда, підготуватися до екскурсії та користуватися каталогом."
        path="/journal"
      />

      <Breadcrumbs items={[{ label: 'Журнал' }]} />

      <section className="border-b border-divider bg-surface">
        <div className="container-site py-10 md:py-14">
          <p className="section-title-sm mb-3">Журнал</p>
          <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
            Корисне для мандрівників
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted">
            Поради з вибору гіда, підготовки до подорожі та історії від місцевих експертів.
          </p>
        </div>
      </section>

      <section className="container-site py-10 md:py-14">
        {isLoading ? (
          <p className="text-muted">Завантаження...</p>
        ) : items.length === 0 ? (
          <p className="text-muted">Статей поки немає.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <JournalArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export function JournalArticlePage() {
  const { slug = '' } = useParams()

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => articlesApi.get(slug),
    enabled: !!slug,
  })

  if (isLoading) return <div className="container-site py-10">Завантаження...</div>
  if (!article) return <div className="container-site py-10">Статтю не знайдено</div>

  const cover = resolveMediaUrl(article.cover_image_url)

  return (
    <>
      <Seo
        title={pageTitle(article.title)}
        description={article.excerpt || article.title}
        path={`/journal/${article.slug}`}
        image={cover}
      />

      <Breadcrumbs
        items={[
          { label: 'Журнал', to: '/journal' },
          { label: article.title },
        ]}
      />

      {cover && (
        <div className="border-b border-divider bg-sand-100">
          <img
            src={cover}
            alt=""
            className="aspect-[21/9] w-full max-h-[420px] object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="container-site py-8 md:py-10">
        <article className="mx-auto max-w-3xl">
          {article.published_at && (
            <time className="text-sm text-muted" dateTime={article.published_at}>
              {formatArticleDate(article.published_at)}
            </time>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-muted">{article.excerpt}</p>
          )}
          {article.author && (
            <div className="article-byline-panel mt-8">
              <ArticleAuthorByline author={article.author} />
            </div>
          )}
          <div
            className="excursion-body mt-8"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body_html) }}
          />
          {article.author && (
            <footer className="article-byline-panel mt-10">
              <p className="article-byline-panel__label">Автор</p>
              <ArticleAuthorByline author={article.author} />
              {article.author.guide_slug && (
                <Link to={`/guide/${article.author.guide_slug}`} className="article-byline-panel__cta">
                  Профіль гіда та екскурсії →
                </Link>
              )}
            </footer>
          )}
          <div className="mt-10 border-t border-divider pt-8">
            <Link to="/journal" className="link-accent text-sm normal-case">
              ← Усі статті
            </Link>
          </div>
        </article>
      </div>
    </>
  )
}
