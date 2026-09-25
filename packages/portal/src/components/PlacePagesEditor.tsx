import { Suspense, useMemo, useState } from 'react'
import { lazyRichTextEditor } from '@gaido/ui-primitives/lazyRichTextEditor'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import {
  placePagesApi,
  type PlaceFAQ,
  type PlacePage,
  type PlaceType,
} from '@gaido/api-client/api/placePages'
import { guidesUrl } from '@gaido/site-urls/site'
import { ImageUrlField } from './ImageUrlField'

const RichTextEditor = lazyRichTextEditor(() => import('./RichTextEditor'))

function emptyPage(type: PlaceType, id: number, slug: string, name: string, countryName?: string): PlacePage {
  return {
    place_type: type,
    place_id: id,
    slug,
    name,
    country_name: countryName,
    public_path: type === 'country' ? `/countries/${slug}` : `/city/${slug}`,
    excerpt: '',
    intro_html: '',
    seo_title: '',
    seo_description: '',
    seo_image_url: '',
    faq: [],
  }
}

export function PlacePagesEditor() {
  const qc = useQueryClient()
  const [countryId, setCountryId] = useState(0)
  const [cityId, setCityId] = useState(0)
  const [draft, setDraft] = useState<PlacePage | null>(null)
  const [saving, setSaving] = useState(false)
  const [opening, setOpening] = useState(false)
  const [message, setMessage] = useState('')

  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => catalogApi.countries(),
  })
  const countries = useMemo(
    () => [...(countriesData?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    [countriesData],
  )
  const country = countries.find((c) => c.id === countryId)

  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => catalogApi.cities(),
    enabled: Boolean(country),
  })
  const cities = useMemo(
    () =>
      [...(citiesData?.items ?? [])]
        .filter((c) => c.country_id === countryId)
        .sort((a, b) => a.name.localeCompare(b.name, 'uk')),
    [citiesData, countryId],
  )
  const city = cities.find((c) => c.id === cityId)

  const pickCountry = (id: number) => {
    setCountryId(id)
    setCityId(0)
    setDraft(null)
    setMessage('')
  }

  const openEdit = async () => {
    if (!country) return
    const type: PlaceType = city ? 'city' : 'country'
    const id = city ? city.id : country.id
    const slug = city ? city.slug : country.slug
    const name = city ? city.name : country.name
    setOpening(true)
    setMessage('')
    try {
      const page = await placePagesApi.admin.get(type, id)
      setDraft({
        ...emptyPage(type, id, slug, name, city ? country.name : undefined),
        ...page,
        excerpt: page.excerpt ?? '',
        intro_html: page.intro_html ?? '',
        faq: page.faq ?? [],
      })
    } catch {
      setDraft(emptyPage(type, id, slug, name, city ? country.name : undefined))
      setMessage('Не вдалося завантажити сторінку')
    } finally {
      setOpening(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMessage('')
    try {
      const saved = await placePagesApi.admin.save(draft.place_type, draft.place_id, {
        excerpt: draft.excerpt,
        intro_html: draft.intro_html,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        seo_image_url: draft.seo_image_url,
        faq: (draft.faq ?? []).filter((item) => item.question.trim() && item.answer.trim()),
      })
      setDraft({ ...saved, excerpt: saved.excerpt ?? '', intro_html: saved.intro_html ?? '', faq: saved.faq ?? [] })
      qc.invalidateQueries({ queryKey: ['place-page'] })
      setMessage('Збережено')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    if (!draft || !confirm('Очистити контент цієї сторінки? Повернуться стандартні тексти.')) return
    setSaving(true)
    setMessage('')
    try {
      await placePagesApi.admin.remove(draft.place_type, draft.place_id)
      setDraft(emptyPage(draft.place_type, draft.place_id, draft.slug, draft.name, draft.country_name))
      qc.invalidateQueries({ queryKey: ['place-page'] })
      setMessage('Очищено')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка видалення')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">Сторінки країн і міст</h2>
          <p className="mt-1 text-sm text-stone-500">
            Оберіть країну, за потреби місто — і відкрийте форму редагування.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Країна</span>
            <select
              className="input w-full"
              value={countryId || ''}
              onChange={(e) => pickCountry(Number(e.target.value) || 0)}
              disabled={countriesLoading}
            >
              <option value="">{countriesLoading ? 'Завантаження…' : 'Оберіть країну'}</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Місто</span>
            <select
              className="input w-full"
              value={cityId || ''}
              onChange={(e) => {
                setCityId(Number(e.target.value) || 0)
                setDraft(null)
                setMessage('')
              }}
              disabled={!country || citiesLoading}
            >
              <option value="">{!country ? 'Спочатку країна' : citiesLoading ? 'Завантаження…' : 'Уся країна'}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" disabled={!country || opening} onClick={openEdit}>
            {opening ? 'Відкриття…' : 'Змінити'}
          </button>
        </div>
      </div>

      {draft && (
        <PlacePageForm
          draft={draft}
          saving={saving}
          message={message}
          onChange={setDraft}
          onSave={save}
          onClear={clear}
        />
      )}
    </div>
  )
}

function PlacePageForm({
  draft,
  saving,
  message,
  onChange,
  onSave,
  onClear,
}: {
  draft: PlacePage
  saving: boolean
  message: string
  onChange: (page: PlacePage) => void
  onSave: () => void
  onClear: () => void
}) {
  const title = draft.place_type === 'city' && draft.country_name
    ? `${draft.name}, ${draft.country_name}`
    : draft.name
  const patch = (next: Partial<PlacePage>) => onChange({ ...draft, ...next })

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {draft.place_type === 'city' ? 'Місто' : 'Країна'} · {draft.public_path}
          </p>
        </div>
        <a className="text-sm text-teal hover:underline" href={guidesUrl(draft.public_path)} target="_blank" rel="noreferrer">
          Відкрити на сайті →
        </a>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Короткий опис</span>
        <textarea
          className="input min-h-[88px] w-full"
          maxLength={500}
          value={draft.excerpt ?? ''}
          placeholder="Під заголовком сторінки, перед гідами та екскурсіями"
          onChange={(e) => patch({ excerpt: e.target.value })}
        />
        <span className="text-xs text-stone-500">Якщо порожньо — стандартний абзац. {(draft.excerpt ?? '').length}/500</span>
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Контент</p>
        <p className="mb-2 text-xs text-stone-500">Під гідами та екскурсіями, над питаннями-відповідями.</p>
        <Suspense fallback={<p className="text-sm text-stone-500">Редактор...</p>}>
          <RichTextEditor
            value={draft.intro_html}
            onChange={(intro_html) => patch({ intro_html })}
            disabled={saving}
          />
        </Suspense>
      </div>

      <FaqEditor items={draft.faq ?? []} onChange={(faq) => patch({ faq })} />

      <section className="space-y-3 border-t border-border pt-5">
        <h3 className="font-medium text-ink">SEO</h3>
        <label className="block space-y-1">
          <span className="text-sm font-medium">SEO заголовок</span>
          <input
            className="input w-full"
            maxLength={120}
            value={draft.seo_title}
            placeholder={`Екскурсії українською в ${draft.name}`}
            onChange={(e) => patch({ seo_title: e.target.value })}
          />
          <span className="text-xs text-stone-500">У вкладці браузера додамо «— Gaido». {draft.seo_title.length}/120</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">SEO опис</span>
          <textarea
            className="input min-h-[88px] w-full"
            maxLength={320}
            value={draft.seo_description}
            placeholder="Короткий опис для Google і соцмереж"
            onChange={(e) => patch({ seo_description: e.target.value })}
          />
          <span className="text-xs text-stone-500">{draft.seo_description.length}/320 · у снипеті до 160 символів</span>
        </label>
        <ImageUrlField
          label="SEO картинка"
          hint="Обкладинка для соцмереж (Open Graph). Рекомендовано 1200×630."
          value={draft.seo_image_url}
          cropAspect={1200 / 630}
          maxBytes={250 * 1024}
          onChange={(seo_image_url) => patch({ seo_image_url })}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={onSave}>
          {saving ? 'Збереження...' : 'Зберегти'}
        </button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={onClear}>
          Очистити
        </button>
        {message && <span className="text-sm text-stone-600">{message}</span>}
      </div>
    </div>
  )
}

function FaqEditor({ items, onChange }: { items: PlaceFAQ[]; onChange: (items: PlaceFAQ[]) => void }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium text-ink">Питання та відповіді</h3>
          <p className="text-xs text-stone-500">Якщо порожньо — покажемо стандартний FAQ.</p>
        </div>
        <button
          type="button"
          className="text-sm text-teal hover:underline"
          onClick={() => onChange([...items, { question: '', answer: '' }])}
        >
          + Додати
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border p-3">
          <input
            className="input w-full"
            placeholder="Питання"
            value={item.question}
            onChange={(e) => {
              const next = [...items]
              next[i] = { ...next[i], question: e.target.value }
              onChange(next)
            }}
          />
          <textarea
            className="input min-h-[72px] w-full"
            placeholder="Відповідь"
            value={item.answer}
            onChange={(e) => {
              const next = [...items]
              next[i] = { ...next[i], answer: e.target.value }
              onChange(next)
            }}
          />
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Видалити
          </button>
        </div>
      ))}
    </section>
  )
}
