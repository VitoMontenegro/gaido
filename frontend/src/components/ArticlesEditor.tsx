import { lazy, Suspense, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { articlesApi, type Article } from '../api/client'
import { ImageUrlField } from './ImageUrlField'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

type Props = {
  apiBase: 'admin' | 'moderator'
}

const emptyDraft = (): Partial<Article> => ({
  title: '',
  slug: '',
  excerpt: '',
  body_html: '<p></p>',
  cover_image_url: '',
  status: 'DRAFT',
})

export function ArticlesEditor({ apiBase }: Props) {
  const qc = useQueryClient()
  const cms = apiBase === 'admin' ? articlesApi.admin : articlesApi.moderator
  const [items, setItems] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<Article>>(emptyDraft())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await cms.list()
      setItems(data.items)
    } catch {
      setMessage('Не вдалося завантажити статті')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [apiBase])

  const select = (article: Article) => {
    setSelectedId(article.id)
    setDraft({ ...article })
    setMessage('')
  }

  const startNew = () => {
    setSelectedId(null)
    setDraft(emptyDraft())
    setMessage('')
  }

  const save = async () => {
    if (!draft.title?.trim() || !draft.body_html?.trim()) {
      setMessage('Заповніть заголовок і текст статті')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const body = {
        title: draft.title,
        slug: draft.slug ?? '',
        excerpt: draft.excerpt ?? '',
        body_html: draft.body_html,
        cover_image_url: draft.cover_image_url ?? '',
        status: draft.status ?? 'DRAFT',
      }
      if (selectedId) {
        const saved = await cms.update(selectedId, body)
        setDraft({ ...saved })
        setItems((prev) => prev.map((a) => (a.id === saved.id ? saved : a)))
      } else {
        const saved = await cms.create(body)
        setSelectedId(saved.id)
        setDraft({ ...saved })
        setItems((prev) => [saved, ...prev])
      }
      qc.invalidateQueries({ queryKey: ['articles'] })
      setMessage('Збережено')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!selectedId || !confirm('Видалити цю статтю?')) return
    setSaving(true)
    setMessage('')
    try {
      await cms.remove(selectedId)
      setItems((prev) => prev.filter((a) => a.id !== selectedId))
      startNew()
      qc.invalidateQueries({ queryKey: ['articles'] })
      setMessage('Видалено')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка видалення')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">Статті</p>
          <button type="button" className="btn-primary py-1 text-xs" onClick={startNew}>
            + Нова
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-stone-500">Завантаження...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">Поки немає статей</p>
        ) : (
          <ul className="max-h-[480px] space-y-1 overflow-y-auto">
            {items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => select(a)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedId === a.id ? 'bg-ink text-white' : 'bg-sand-50 hover:bg-sand-100'
                  }`}
                >
                  <span className="line-clamp-2 font-medium">{a.title}</span>
                  <span className={`mt-0.5 block text-xs ${selectedId === a.id ? 'text-white/70' : 'text-stone-500'}`}>
                    {a.status === 'PUBLISHED' ? 'Опубліковано' : 'Чернетка'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Заголовок</span>
            <input
              className="input w-full"
              value={draft.title ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Slug (URL)</span>
            <input
              className="input w-full"
              value={draft.slug ?? ''}
              placeholder="авто з заголовка"
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Короткий опис</span>
          <textarea
            className="input min-h-[80px] w-full"
            value={draft.excerpt ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
          />
        </label>

        <ImageUrlField
          label="Обкладинка"
          value={draft.cover_image_url ?? ''}
          onChange={(cover_image_url) => setDraft((d) => ({ ...d, cover_image_url }))}
        />

        <label className="block space-y-1">
          <span className="text-sm font-medium">Статус</span>
          <select
            className="input w-full max-w-xs"
            value={draft.status ?? 'DRAFT'}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="DRAFT">Чернетка</option>
            <option value="PUBLISHED">Опубліковано</option>
          </select>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Текст статті</p>
          <Suspense fallback={<p className="text-sm text-stone-500">Редактор...</p>}>
            <RichTextEditor
              value={draft.body_html ?? ''}
              onChange={(body_html) => setDraft((d) => ({ ...d, body_html }))}
              disabled={saving}
            />
          </Suspense>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Збереження...' : 'Зберегти'}
          </button>
          {selectedId && (
            <button type="button" className="btn-secondary" disabled={saving} onClick={remove}>
              Видалити
            </button>
          )}
          {message && <span className="text-sm text-stone-600">{message}</span>}
        </div>
      </div>
    </div>
  )
}
