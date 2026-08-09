import { Seo } from '../lib/seo'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { articlesApi, resolveMediaUrl, type ArticleListItem } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import { pageTitle } from '../lib/brand'
import { sanitizeHtml } from '../lib/html'

function formatArticleDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ArticleCard({ article }: { article: ArticleListItem }) {
  const cover = resolveMediaUrl(article.cover_image_url)
  return (
    <Link to={`/journal/${article.slug}`} className="journal-card group">
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
        <h2 className="journal-card__title">{article.title}</h2>
        {article.excerpt && <p className="journal-card__excerpt">{article.excerpt}</p>}
        <span className="journal-card__more">Читати →</span>
      </div>
    </Link>
  )
}

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
            Поради з вибору гіда, підготовки до подорожі та використання каталогу екскурсій.
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
              <ArticleCard key={article.id} article={article} />
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
        <article>
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
          <div
            className="excursion-body mt-8"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body_html) }}
          />
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
