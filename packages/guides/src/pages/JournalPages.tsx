import { useMemo } from 'react'
import { Seo } from '../lib/seo'
import { Link, useParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { articlesApi, resolveMediaUrl } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import ArticleAuthorByline from '../components/ArticleAuthorByline'
import JournalArticleCard, { formatArticleDate } from '../components/JournalArticleCard'
import { buildArticleJsonLd } from '../lib/excursionListingSchema'
import { SEO_JOURNAL_DESCRIPTION, SEO_JOURNAL_HEADING } from '../lib/seoTemplates'
import { pageTitle } from '@gaido/site-urls/brand'
import { sanitizeHtml } from '../lib/html'

/** 12 ділиться на 2, 3 і 4 колонки — сітка завжди заповнена рівними рядами. */
const JOURNAL_PAGE = 12

function JournalGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="journal-card" aria-hidden>
          <div className="aspect-[16/10] animate-pulse bg-sand-100" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-11/12 animate-pulse rounded bg-sand-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-sand-100" />
            <div className="h-3 w-full animate-pulse rounded bg-sand-100" />
          </div>
        </div>
      ))}
    </>
  )
}

export function JournalListPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['articles', 'journal', 'paged'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // Беремо на 1 більше, щоб знати, чи є ще статті (API не повертає total).
      const res = await articlesApi.list(JOURNAL_PAGE + 1, 'journal', pageParam)
      const items = res.items ?? []
      return { items: items.slice(0, JOURNAL_PAGE), hasMore: items.length > JOURNAL_PAGE }
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * JOURNAL_PAGE : undefined,
  })
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])

  return (
    <>
      <Seo
        title={pageTitle(SEO_JOURNAL_HEADING)}
        description={SEO_JOURNAL_DESCRIPTION}
        path="/journal"
      />

      <Breadcrumbs items={[{ label: 'Журнал' }]} />

      <div className="container-site py-6 md:py-8">
        <header className="journal-hero">
          <h1 className="journal-hero__title">{SEO_JOURNAL_HEADING}</h1>
          <p className="journal-hero__lead">{SEO_JOURNAL_DESCRIPTION}</p>
        </header>

        <section aria-label="Статті журналу" className="mt-6 md:mt-8">
          {!isLoading && items.length === 0 ? (
            <p className="text-muted">Статей поки немає.</p>
          ) : (
            <div className="journal-grid">
              {items.map((article, index) => (
                <JournalArticleCard key={article.id} article={article} priority={index < 4} />
              ))}
              {(isLoading || isFetchingNextPage) && <JournalGridSkeleton count={isLoading ? 8 : 4} />}
            </div>
          )}

          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                type="button"
                className="btn-secondary px-8"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                aria-busy={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Завантаження…' : 'Показати ще'}
              </button>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {items.length > 0 ? `Показано статей: ${items.length}` : ''}
          </p>
        </section>
      </div>
    </>
  )
}

const WORDS_PER_MINUTE = 200

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/[«»"“”„]/g, '').trim().toLowerCase()
}

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
}

/** Лінива загрузка та осмислений alt для зображень у тілі статті. */
function enhanceArticleImages(html: string, title: string) {
  let n = 0
  return html.replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => {
    n += 1
    let next = attrs
    if (!/\sloading=/i.test(next)) next += ' loading="lazy"'
    if (!/\sdecoding=/i.test(next)) next += ' decoding="async"'
    const altLabel = `${title} — фото ${n}`.replace(/"/g, '&quot;')
    if (/\salt=""/i.test(next)) next = next.replace(/\salt=""/i, ` alt="${altLabel}"`)
    else if (!/\salt=/i.test(next)) next += ` alt="${altLabel}"`
    return `<img${next}>`
  })
}

export function JournalArticlePage() {
  const { slug = '' } = useParams()

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', 'journal', slug],
    queryFn: () => articlesApi.get(slug, 'journal'),
    enabled: !!slug,
  })

  const { data: latest } = useQuery({
    queryKey: ['articles', 'journal', 'related'],
    queryFn: () => articlesApi.list(5, 'journal'),
    enabled: !!article,
    staleTime: 5 * 60 * 1000,
  })

  const prepared = useMemo(() => {
    if (!article) return null
    const bodyHtml = enhanceArticleImages(sanitizeHtml(article.body_html), article.title)
    const plain = stripTags(article.body_html ?? '')
    const words = plain.split(/\s+/).filter(Boolean).length
    const readingMinutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
    // Часто анонс = перший абзац статті — тоді не дублюємо його над текстом.
    const excerpt = (article.excerpt ?? '').trim()
    const excerptHead = normalizeText(excerpt).slice(0, 80)
    const showLead = !!excerpt && !normalizeText(plain).slice(0, 400).includes(excerptHead)
    return { bodyHtml, readingMinutes, showLead, wordCount: words }
  }, [article])

  if (isLoading) {
    return (
      <div className="container-site py-6 md:py-10" aria-busy>
        <div className="article-shell">
          <div className="mx-auto max-w-[720px] space-y-4">
            <div className="h-4 w-40 animate-pulse rounded bg-sand-100" />
            <div className="h-10 w-full animate-pulse rounded bg-sand-100" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-sand-100" />
            <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-sand-100" />
          </div>
        </div>
      </div>
    )
  }
  if (!article || !prepared) {
    return (
      <>
        <Seo title={pageTitle('Статтю не знайдено')} noIndex />
        <div className="container-site py-10">
          <p>Статтю не знайдено</p>
          <Link to="/journal" className="link-accent mt-4 inline-block text-sm normal-case">
            ← До журналу
          </Link>
        </div>
      </>
    )
  }

  const cover = resolveMediaUrl(article.cover_image_url)
  const related = (latest?.items ?? []).filter((a) => a.slug !== article.slug).slice(0, 4)
  const author = article.author
  const isGuideAuthor = !!author?.guide_slug

  return (
    <>
      <Seo
        title={pageTitle(article.title)}
        description={article.excerpt || article.title}
        path={`/journal/${article.slug}`}
        image={cover}
        largeImagePreview
        jsonLd={buildArticleJsonLd({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          cover_image_url: article.cover_image_url,
          published_at: article.published_at,
          updated_at: article.updated_at,
          author: author ?? undefined,
          word_count: prepared.wordCount,
        })}
      />

      <Breadcrumbs
        currentPath={`/journal/${article.slug}`}
        items={[
          { label: 'Журнал', to: '/journal' },
          { label: article.title },
        ]}
      />

      <div className="container-site py-5 md:py-10">
        <article className="article-shell">
          <header className="article-header">
            <div className="article-meta">
              {article.published_at && (
                <time dateTime={article.published_at}>{formatArticleDate(article.published_at)}</time>
              )}
              {article.published_at && <span aria-hidden>·</span>}
              <span>{prepared.readingMinutes} хв читання</span>
            </div>
            <h1 className="article-title">{article.title}</h1>
            {prepared.showLead && <p className="article-lead">{article.excerpt}</p>}
            {author?.display_name && (
              <div className="article-header__author">
                <ArticleAuthorByline author={author} />
              </div>
            )}
          </header>

          {cover && (
            <figure className="article-cover">
              <img
                src={cover}
                alt={article.title}
                width={1200}
                height={675}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </figure>
          )}

          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: prepared.bodyHtml }}
          />

          {author?.display_name && (
            <aside className="article-author-card" aria-label="Про автора">
              <ArticleAuthorByline author={author} />
              {isGuideAuthor && (
                <div className="article-author-card__actions">
                  <p className="text-sm text-muted">
                    Хочете побачити все це наживо? Автор статті проводить екскурсії українською.
                  </p>
                  <Link to={`/guide/${author.guide_slug}`} className="btn-accent shrink-0 px-5">
                    Екскурсії гіда
                  </Link>
                </div>
              )}
            </aside>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-10 md:mt-14" aria-labelledby="related-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="section-title-sm">Читайте також</h2>
              <Link to="/journal" className="link-accent shrink-0 text-sm normal-case">
                Усі статті →
              </Link>
            </div>
            <div className="journal-grid">
              {related.map((a) => (
                <JournalArticleCard key={a.id} article={a} heading="h3" />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
