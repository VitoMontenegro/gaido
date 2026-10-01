import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { forumsApi, type Forum, type ForumAuthor, type ForumTopic, type ForumTopicResponse } from '@gaido/api-client/api/forums'
import { formatApiError, getApiErrorCode } from '@gaido/api-client/api/http'
import { useForumTopic } from '@gaido/api-client/hooks/useForumTopic'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../lib/seo'
import { SEO_FORUMS_DESCRIPTION, SEO_FORUMS_HEADING } from '../lib/seoTemplates'
import Breadcrumbs from '../components/Breadcrumbs'
import GuideAvatar from '../components/GuideAvatar'

function formatForumDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M7 11V8a5 5 0 0110 0v3" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  )
}

function ForumIcon() {
  return (
    <svg className="forum-icon" viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect x="2" y="5" width="24" height="18" rx="4" fill="currentColor" opacity="0.18" />
      <rect x="8" y="11" width="24" height="18" rx="4" fill="currentColor" />
      <path d="M14 20h12M14 24h8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function TopicIcon() {
  return (
    <svg className="forum-icon h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="4" y="6" width="24" height="20" rx="4" fill="currentColor" />
      <path d="M10 14h12M10 19h8" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function AuthorName({ author }: { author?: ForumAuthor | null }) {
  if (!author?.display_name) return <span className="text-muted">—</span>
  if (author.guide_slug) {
    return (
      <Link to={`/guide/${author.guide_slug}`} className="forum-link">
        {author.display_name}
      </Link>
    )
  }
  return <span className="font-medium text-ink">{author.display_name}</span>
}

function LoginHint({ text }: { text: string }) {
  const location = useLocation()
  return (
    <p className="text-sm text-muted">
      {text}{' '}
      <Link to="/login" state={{ from: location.pathname }} className="link-accent">
        Увійти
      </Link>
      {' · '}
      <Link to="/register" className="link-accent">
        Реєстрація
      </Link>
    </p>
  )
}

function LastPost({
  to,
  title,
  author,
  at,
}: {
  to: string
  title: string
  author?: ForumAuthor | null
  at: string
}) {
  return (
    <div className="min-w-0">
      <Link to={to} className="forum-link line-clamp-2">
        {title}
      </Link>
      <p className="mt-0.5 text-xs text-muted">
        від <AuthorName author={author} /> {formatForumDate(at)}
      </p>
    </div>
  )
}

function ForumPageHead({
  eyebrow,
  title,
  description,
  stats,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  stats?: string
  actions?: ReactNode
}) {
  return (
    <section className="border-b border-divider bg-surface">
      <div className="container-site py-6 md:py-8">
        <div className="forum-toolbar">
          <div className="min-w-0">
            {eyebrow && <p className="section-title-sm mb-2">{eyebrow}</p>}
            <h1 className="font-display text-2xl font-bold normal-case tracking-normal md:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">{description}</p>}
            {stats && <p className="mt-2 text-sm text-muted">{stats}</p>}
          </div>
          {actions}
        </div>
      </div>
    </section>
  )
}

function ForumSection({ title, forums }: { title: string; forums: Forum[] }) {
  if (forums.length === 0) return null
  return (
    <div className="forum-wrap">
      <table className="forum-table">
        <thead>
          <tr>
            <th>Назва форуму</th>
            <th className="forum-num hidden sm:table-cell">Тем</th>
            <th className="forum-num hidden sm:table-cell">Повідомлень</th>
            <th className="hidden md:table-cell">Останнє повідомлення</th>
          </tr>
        </thead>
        <tbody>
          <tr className="forum-cat">
            <td colSpan={4}>{title}</td>
          </tr>
          {forums.map((forum) => (
            <ForumRow key={forum.id} forum={forum} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ForumRow({ forum }: { forum: Forum }) {
  const last = forum.can_read ? forum.last_post : null
  return (
    <tr>
      <td>
        <div className="flex gap-3">
          <ForumIcon />
          <div className="min-w-0">
            <Link to={`/forums/${forum.slug}`} className="forum-link inline-flex items-center gap-1.5">
              {!forum.can_read && <LockIcon />}
              {forum.title}
            </Link>
            {forum.description && <p className="mt-0.5 text-xs text-muted md:text-sm">{forum.description}</p>}
            <p className="mt-2 text-xs text-muted sm:hidden">
              Тем: {forum.topic_count} · Повідомлень: {forum.post_count}
            </p>
            {last && (
              <div className="mt-2 md:hidden">
                <LastPost
                  to={`/forums/${forum.slug}/${last.topic_id}`}
                  title={last.topic_title}
                  author={last.author}
                  at={last.created_at}
                />
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="forum-num hidden sm:table-cell">{forum.topic_count}</td>
      <td className="forum-num hidden sm:table-cell">{forum.post_count}</td>
      <td className="hidden md:table-cell">
        {last ? (
          <LastPost
            to={`/forums/${forum.slug}/${last.topic_id}`}
            title={last.topic_title}
            author={last.author}
            at={last.created_at}
          />
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  )
}

export function ForumIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['forums'],
    queryFn: forumsApi.list,
  })
  const items = data?.items ?? []
  const publicForums = items.filter((f) => f.audience === 'public')
  const topicCount = publicForums.reduce((sum, f) => sum + f.topic_count, 0)
  const postCount = publicForums.reduce((sum, f) => sum + f.post_count, 0)

  return (
    <>
      <Seo title={pageTitle(SEO_FORUMS_HEADING)} description={SEO_FORUMS_DESCRIPTION} path="/forums" />
      <Breadcrumbs items={[{ label: 'Форуми' }]} />
      <ForumPageHead
        eyebrow="Спільнота"
        title={SEO_FORUMS_HEADING}
        description={SEO_FORUMS_DESCRIPTION}
        stats={isLoading ? undefined : `${postCount} повідомлень у ${topicCount} темах`}
      />
      <section className="container-site py-6 md:py-8">
        {isLoading ? <p className="text-muted">Завантаження...</p> : <ForumSection title="Для всіх" forums={publicForums} />}
      </section>
    </>
  )
}

export function ForumBoardPage() {
  const { slug = '' } = useParams()
  const { data: me } = useMe()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [openForm, setOpenForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['forum', slug],
    queryFn: () => forumsApi.get(slug),
    enabled: !!slug,
    retry: false,
  })

  const create = useMutation({
    mutationFn: () => forumsApi.createTopic(slug, { title, body }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['forums'] })
      void qc.invalidateQueries({ queryKey: ['forum', slug] })
      navigate(`/forums/${slug}/${res.topic.id}`)
    },
    onError: (err) => setError(formatApiError(err)),
  })

  if (query.isError && getApiErrorCode(query.error) === 'FORBIDDEN') {
    return (
      <>
        <Seo title={pageTitle('Для гідів')} path={`/forums/${slug}`} noIndex />
        <Breadcrumbs items={[{ label: 'Форуми', to: '/forums' }, { label: 'Для гідів' }]} />
        <section className="container-site py-10 md:py-14">
          <div className="card max-w-xl space-y-3">
            <h1 className="inline-flex items-center gap-2 font-display text-2xl font-bold">
              <LockIcon /> Для гідів
            </h1>
            <p className="text-muted">Цей форум доступний лише гідам. Увійдіть з акаунтом гіда, щоб читати й писати.</p>
            {!me ? (
              <LoginHint text="Немає доступу?" />
            ) : (
              <p className="text-sm text-muted">
                Потрібна роль гіда.{' '}
                <Link to="/register/guide" className="link-accent">
                  Стати гідом
                </Link>
              </p>
            )}
          </div>
        </section>
      </>
    )
  }

  if (query.isError) {
    return (
      <>
        <Seo title={pageTitle('Форум')} path={`/forums/${slug}`} noIndex />
        <Breadcrumbs items={[{ label: 'Форуми', to: '/forums' }, { label: 'Форум' }]} />
        <section className="container-site py-10">
          <p className="text-muted">Форум не знайдено.</p>
        </section>
      </>
    )
  }

  const forum = query.data?.forum
  const topics = query.data?.items ?? []
  const newTopic = forum?.can_write ? (
    <button type="button" className="btn-accent" onClick={() => setOpenForm((v) => !v)}>
      {openForm ? 'Скасувати' : 'Нова тема'}
    </button>
  ) : undefined

  return (
    <>
      <Seo
        title={pageTitle(forum?.title || 'Форум')}
        description={forum?.description || SEO_FORUMS_DESCRIPTION}
        path={`/forums/${slug}`}
      />
      <Breadcrumbs items={[{ label: 'Форуми', to: '/forums' }, { label: forum?.title || 'Форум' }]} />
      <ForumPageHead
        eyebrow="Форум"
        title={query.isLoading ? 'Завантаження...' : forum?.title || 'Форум'}
        description={forum?.description}
        stats={forum ? `${forum.post_count} повідомлень у ${forum.topic_count} темах` : undefined}
        actions={newTopic ?? <LoginHint text="Щоб створити тему," />}
      />
      {openForm && forum?.can_write && (
        <section className="container-site pt-6">
          <form
            className="forum-wrap max-w-2xl space-y-3 p-4 md:p-5"
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              create.mutate()
            }}
          >
            <p className="font-display text-sm font-medium uppercase">Нова тема</p>
            <input
              className="input"
              placeholder="Назва теми"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <textarea
              className="input min-h-32"
              placeholder="Текст першого повідомлення"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-accent" disabled={create.isPending}>
              Опублікувати
            </button>
          </form>
        </section>
      )}
      <section className="container-site py-6 md:py-8">
        {query.isLoading ? (
          <p className="text-muted">Завантаження...</p>
        ) : topics.length === 0 ? (
          <p className="text-muted">Тем поки немає.</p>
        ) : (
          <div className="forum-wrap">
            <table className="forum-table">
              <thead>
                <tr>
                  <th>Тема</th>
                  <th className="hidden sm:table-cell">Автор</th>
                  <th className="forum-num hidden sm:table-cell">Відповідей</th>
                  <th className="hidden md:table-cell">Останнє повідомлення</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <td>
                      <div className="flex gap-3">
                        <TopicIcon />
                        <div className="min-w-0">
                          <Link to={`/forums/${slug}/${topic.id}`} className="forum-link">
                            {topic.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted sm:hidden">
                            {topic.author?.display_name || '—'} · {Math.max(topic.post_count - 1, 0)} відп.
                          </p>
                          {topic.last_post_at && (
                            <p className="mt-1 text-xs text-muted md:hidden">{formatForumDate(topic.last_post_at)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <AuthorName author={topic.author} />
                    </td>
                    <td className="forum-num hidden sm:table-cell">{Math.max(topic.post_count - 1, 0)}</td>
                    <td className="hidden md:table-cell">
                      {topic.last_post_at ? (
                        <LastPost
                          to={`/forums/${slug}/${topic.id}`}
                          title={topic.title}
                          author={topic.last_author ?? topic.author}
                          at={topic.last_post_at}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export function ForumTopicPage() {
  const { slug = '', topicId: topicIdParam = '' } = useParams()
  const topicId = Number(topicIdParam)
  const { data: me } = useMe()
  const query = useForumTopic(Number.isFinite(topicId) ? topicId : 0)
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const reply = useMutation({
    mutationFn: () => forumsApi.createPost(topicId, body),
    onSuccess: (post) => {
      setBody('')
      setError('')
      qc.setQueryData<ForumTopicResponse>(['forum-topic', topicId], (prev) => {
        if (!prev) return prev
        if (prev.items.some((p) => p.id === post.id)) return prev
        return { ...prev, items: [...prev.items, post] }
      })
    },
    onError: (err) => setError(formatApiError(err)),
  })

  if (query.isError && getApiErrorCode(query.error) === 'FORBIDDEN') {
    return (
      <>
        <Seo title={pageTitle('Для гідів')} path={`/forums/${slug}/${topicId}`} noIndex />
        <Breadcrumbs items={[{ label: 'Форуми', to: '/forums' }, { label: 'Для гідів' }]} />
        <section className="container-site py-10">
          <p className="text-muted">Ця тема доступна лише гідам.</p>
        </section>
      </>
    )
  }

  if (!Number.isFinite(topicId) || topicId <= 0 || (query.isError && getApiErrorCode(query.error) !== 'FORBIDDEN')) {
    return (
      <>
        <Seo title={pageTitle('Тема')} path={`/forums/${slug}/${topicIdParam}`} noIndex />
        <Breadcrumbs items={[{ label: 'Форуми', to: '/forums' }, { label: 'Тема' }]} />
        <section className="container-site py-10">
          <p className="text-muted">Тему не знайдено.</p>
        </section>
      </>
    )
  }

  const forum = query.data?.forum
  const topic = query.data?.topic
  const posts = query.data?.items ?? []

  return (
    <>
      <Seo
        title={pageTitle(topic?.title || 'Тема')}
        description={topic?.title || SEO_FORUMS_DESCRIPTION}
        path={`/forums/${slug}/${topicId}`}
        noIndex={forum?.audience === 'guides'}
      />
      <Breadcrumbs
        items={[
          { label: 'Форуми', to: '/forums' },
          { label: forum?.title || 'Форум', to: `/forums/${slug}` },
          { label: topic?.title || 'Тема' },
        ]}
      />
      <ForumPageHead
        eyebrow={forum?.title}
        title={query.isLoading ? 'Завантаження...' : topic?.title || 'Тема'}
        stats={topic ? `${posts.length} повідомлень` : undefined}
      />
      <section className="container-site space-y-3 py-6 md:py-8">
        {posts.map((post, index) => (
          <article key={post.id} className="forum-post" id={`post-${post.id}`}>
            <aside className="forum-post__aside">
              <GuideAvatar
                avatar={post.author?.avatar_url}
                name={post.author?.display_name}
                className="h-12 w-12 rounded-full md:h-16 md:w-16 md:rounded-xl"
              />
              <div className="min-w-0">
                <AuthorName author={post.author} />
                {post.author?.guide_slug && <p className="mt-0.5 text-xs text-muted">Гід</p>}
              </div>
            </aside>
            <div className="forum-post__body">
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-divider pb-2 text-xs text-muted">
                <time dateTime={post.created_at}>{formatForumDate(post.created_at)}</time>
                <a href={`#post-${post.id}`} className="tabular-nums hover:text-ink">
                  #{index + 1}
                </a>
              </div>
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink">{post.body}</p>
            </div>
          </article>
        ))}
        {forum?.can_write ? (
          <form
            className="forum-wrap space-y-3 p-4 md:p-5"
            onSubmit={(e) => {
              e.preventDefault()
              reply.mutate()
            }}
          >
            <p className="font-display text-sm font-medium uppercase">Відповісти</p>
            <textarea
              className="input min-h-32"
              placeholder="Ваша відповідь"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-accent" disabled={reply.isPending || !body.trim()}>
              Надіслати
            </button>
          </form>
        ) : (
          <div className="forum-wrap p-4">
            <LoginHint text={me ? 'Немає права писати в цьому форумі.' : 'Щоб відповісти,'} />
          </div>
        )}
      </section>
    </>
  )
}

export default ForumIndexPage
