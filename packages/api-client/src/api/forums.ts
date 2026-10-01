import { api } from './http'

export type ForumAuthor = {
  display_name: string
  avatar_url?: string
  guide_slug?: string
}

export type ForumLastPost = {
  topic_id: number
  topic_title: string
  author?: ForumAuthor
  created_at: string
}

export type Forum = {
  id: number
  slug: string
  title: string
  description: string
  audience: 'public' | 'guides' | string
  topic_count: number
  post_count: number
  last_post_at?: string
  last_post?: ForumLastPost | null
  can_read: boolean
  can_write: boolean
}

export type ForumTopic = {
  id: number
  forum_id: number
  forum_slug: string
  forum_title: string
  forum_audience: string
  title: string
  author_id: number
  author?: ForumAuthor
  post_count: number
  last_post_at?: string
  last_author?: ForumAuthor
  created_at: string
}

export type ForumPost = {
  id: number
  topic_id: number
  author_id: number
  author?: ForumAuthor
  body: string
  created_at: string
}

export type ForumBoardResponse = {
  forum: Forum
  items: ForumTopic[]
}

export type ForumTopicResponse = {
  forum: Forum
  topic: ForumTopic
  items: ForumPost[]
}

export const forumsApi = {
  list: () => api<{ items: Forum[] }>('/api/v1/forums'),
  recentTopics: (limit = 8) => api<{ items: ForumTopic[] }>(`/api/v1/forums/topics/recent?limit=${limit}`),
  get: (slug: string) => api<ForumBoardResponse>(`/api/v1/forums/${slug}`),
  getTopic: (id: number) => api<ForumTopicResponse>(`/api/v1/forums/topics/${id}`),
  longpoll: (id: number, after: number, timeout = 25, signal?: AbortSignal) =>
    api<{ items: ForumPost[] }>(
      `/api/v1/forums/topics/${id}/longpoll?after=${after}&timeout=${timeout}`,
      { signal },
    ),
  createTopic: (slug: string, body: { title: string; body: string }) =>
    api<{ topic: ForumTopic; post: ForumPost }>(`/api/v1/forums/${slug}/topics`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createPost: (topicId: number, body: string) =>
    api<ForumPost>(`/api/v1/forums/topics/${topicId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
}
