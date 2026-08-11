import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { adminApi, type FooterContent, type HomeContent, type HomeCta, type LegalContent } from '../api/client'
import { ImageUrlField } from './ImageUrlField'
import { LegalPageEditor } from './LegalContentEditor'
import { normalizeCategoryTiles } from '../lib/categoryTiles'
import { normalizeLegalContent } from '../lib/legalContent'

type SiteContentPayload = { home: HomeContent; footer: FooterContent; legal: LegalContent }

const DEFAULT_CTA: HomeCta = {
  title: 'Зʼявились питання?',
  text: 'Звʼяжіться з нами — відповімо протягом 60 хвилин у робочий час',
  schedule: 'Пн–Нд 09:00 – 18:00',
  primary_label: 'Знайти екскурсію',
  primary_url: '/search',
  secondary_label: 'Стати гідом',
  secondary_url: '/register/guide',
}

function normalizeHome(home: HomeContent): HomeContent {
  return {
    ...home,
    category_tiles: normalizeCategoryTiles(home.category_tiles),
    cta: home.cta?.title ? home.cta : DEFAULT_CTA,
    stats_title: home.stats_title || 'З нами подорожують мільйони',
    about_title: home.about_title || 'Про нас',
    about_text: home.about_text || '',
    about_button_label: home.about_button_label || 'Дізнатися більше',
    about_button_url: home.about_button_url || '/about',
  }
}

export function SiteContentEditor() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<SiteContentPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    adminApi.siteContent().then((data) => setDraft({
      ...data,
      home: normalizeHome(data.home),
      legal: normalizeLegalContent(data.legal),
    })).catch(() => setMessage('Не вдалося завантажити контент сайту'))
  }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMessage('')
    try {
      const saved = await adminApi.saveSiteContent(draft)
      setDraft({
        ...saved,
        home: normalizeHome(saved.home),
        legal: normalizeLegalContent(saved.legal),
      })
      qc.invalidateQueries({ queryKey: ['site'] })
      setMessage('Збережено')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  if (!draft) {
    return <div className="card text-muted">Завантаження контенту сайту…</div>
  }

  const home = draft.home
  const footer = draft.footer
  const legal = draft.legal

  const updateHome = (patch: Partial<HomeContent>) => setDraft({ ...draft, home: { ...home, ...patch } })
  const updateFooter = (patch: Partial<FooterContent>) => setDraft({ ...draft, footer: { ...footer, ...patch } })
  const updateLegal = (patch: Partial<LegalContent>) => setDraft({ ...draft, legal: { ...legal, ...patch } })
  const updateCta = (patch: Partial<HomeCta>) => updateHome({ cta: { ...home.cta, ...patch } })

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="section-title-sm">Контент головної та футера</h2>
        <p className="mt-1 text-sm text-muted">
          Тексти, зображення плиток категорій, FAQ, статистика та контакти в футері.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-medium text-ink">Hero</h3>
        <input className="input" value={home.hero_title} onChange={(e) => updateHome({ hero_title: e.target.value })} placeholder="Заголовок" />
        <textarea className="input min-h-20" value={home.hero_subtitle} onChange={(e) => updateHome({ hero_subtitle: e.target.value })} placeholder="Підзаголовок" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">Плитки категорій (під hero)</h3>
          <button
            type="button"
            className="text-sm text-brand-700 hover:underline"
            onClick={() => updateHome({ category_tiles: [...home.category_tiles, { label: 'Нова', url: '/', image_url: '' }] })}
          >
            + Додати
          </button>
        </div>
        {home.category_tiles.map((tile, i) => (
          <div key={i} className="rounded-xl border border-border p-3 space-y-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-muted">
                Назва
                <input
                  className="input mt-1"
                  value={tile.label}
                  onChange={(e) => {
                    const next = [...home.category_tiles]
                    next[i] = { ...next[i], label: e.target.value }
                    updateHome({ category_tiles: next })
                  }}
                />
              </label>
              <label className="block text-sm text-muted">
                Посилання
                <input
                  className="input mt-1"
                  value={tile.url}
                  placeholder="/search"
                  onChange={(e) => {
                    const next = [...home.category_tiles]
                    next[i] = { ...next[i], url: e.target.value }
                    updateHome({ category_tiles: next })
                  }}
                />
              </label>
            </div>
            <ImageUrlField
              label="Зображення"
              value={tile.image_url}
              cropAspect={1}
              maxBytes={180 * 1024}
              onChange={(image_url) => {
                const next = [...home.category_tiles]
                next[i] = { ...next[i], image_url }
                updateHome({ category_tiles: next })
              }}
            />
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => updateHome({ category_tiles: home.category_tiles.filter((_, j) => j !== i) })}
            >
              Видалити
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="font-medium text-ink">Блок «Про нас»</h3>
        <input
          className="input"
          value={home.about_title}
          onChange={(e) => updateHome({ about_title: e.target.value })}
          placeholder="Заголовок"
        />
        <textarea
          className="input min-h-28"
          value={home.about_text}
          onChange={(e) => updateHome({ about_text: e.target.value })}
          placeholder="Текст (абзаци через порожній рядок)"
        />
        <ImageUrlField
          label="Зображення"
          value={home.about_image_url}
          cropAspect={4 / 3}
          maxBytes={200 * 1024}
          onChange={(about_image_url) => updateHome({ about_image_url })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-muted">
            Кнопка — текст
            <input
              className="input mt-1"
              value={home.about_button_label}
              onChange={(e) => updateHome({ about_button_label: e.target.value })}
              placeholder="Дізнатися більше"
            />
          </label>
          <label className="block text-sm text-muted">
            Кнопка — посилання
            <input
              className="input mt-1"
              value={home.about_button_url}
              onChange={(e) => updateHome({ about_button_url: e.target.value })}
              placeholder="/about"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h3 className="font-medium text-ink">Блок «Зʼявились питання?»</h3>
        <input className="input" value={home.cta.title} onChange={(e) => updateCta({ title: e.target.value })} placeholder="Заголовок" />
        <textarea className="input min-h-16" value={home.cta.text} onChange={(e) => updateCta({ text: e.target.value })} placeholder="Текст" />
        <input className="input" value={home.cta.schedule} onChange={(e) => updateCta({ schedule: e.target.value })} placeholder="Графік роботи" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" value={home.cta.primary_label} onChange={(e) => updateCta({ primary_label: e.target.value })} placeholder="Кнопка 1 — текст" />
          <input className="input" value={home.cta.primary_url} onChange={(e) => updateCta({ primary_url: e.target.value })} placeholder="Кнопка 1 — URL" />
          <input className="input" value={home.cta.secondary_label} onChange={(e) => updateCta({ secondary_label: e.target.value })} placeholder="Кнопка 2 — текст" />
          <input className="input" value={home.cta.secondary_url} onChange={(e) => updateCta({ secondary_url: e.target.value })} placeholder="Кнопка 2 — URL" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-ink">Статистика</h3>
        <input
          className="input"
          value={home.stats_title ?? ''}
          onChange={(e) => updateHome({ stats_title: e.target.value })}
          placeholder="З нами подорожують мільйони"
        />
        <ListEditor
          title="Показники"
          items={home.stats}
          onChange={(stats) => updateHome({ stats })}
          fields={[
            { key: 'value', label: 'Значення', placeholder: '2 млн+' },
            { key: 'label', label: 'Підпис', placeholder: 'мандрівників на рік' },
          ]}
        />
      </section>

      <ListEditor
        title="Переваги"
        items={home.benefits}
        onChange={(benefits) => updateHome({ benefits })}
        fields={[
          { key: 'title', label: 'Заголовок', placeholder: 'Прямий контакт' },
          { key: 'text', label: 'Текст', placeholder: 'Опис переваги' },
        ]}
      />

      <ListEditor
        title="FAQ"
        items={home.faq}
        onChange={(faq) => updateHome({ faq })}
        fields={[
          { key: 'question', label: 'Питання', placeholder: 'Як забронювати?' },
          { key: 'answer', label: 'Відповідь', placeholder: 'Текст відповіді' },
        ]}
      />

      <section className="space-y-3">
        <h3 className="font-medium text-ink">Рекомендовані (slug через кому)</h3>
        <p className="text-sm text-muted-light">
          Розміщення на головній керується оплатою в кабінеті гіда. Поля нижче залишені для довідки.
        </p>
        <label className="block text-sm text-muted">
          Популярні міста (slug)
          <input
            className="input mt-1"
            value={home.popular_city_slugs.join(', ')}
            onChange={(e) =>
              updateHome({
                popular_city_slugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="kyiv, lviv"
          />
        </label>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h3 className="font-medium text-ink">Футер</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" value={footer.phone} onChange={(e) => updateFooter({ phone: e.target.value })} placeholder="Телефон" />
          <input className="input" value={footer.email} onChange={(e) => updateFooter({ email: e.target.value })} placeholder="Email" />
          <input className="input" value={footer.telegram} onChange={(e) => updateFooter({ telegram: e.target.value })} placeholder="Telegram" />
          <input className="input" value={footer.copyright} onChange={(e) => updateFooter({ copyright: e.target.value })} placeholder="Copyright" />
        </div>
        <textarea className="input min-h-20" value={footer.description} onChange={(e) => updateFooter({ description: e.target.value })} placeholder="Опис у футері" />
        <FooterColumnsEditor columns={footer.columns} onChange={(columns) => updateFooter({ columns })} />
      </section>

      <section className="space-y-4 border-t border-divider pt-6">
        <div>
          <h2 className="section-title-sm">Юридичні документи</h2>
          <p className="mt-1 text-sm text-muted">
            Тексти для сторінок реєстрації та посилань у футері. Публічні URL: /legal/privacy, /legal/site-rules, /legal/placement-rules.
          </p>
        </div>
        <LegalPageEditor
          label="Політика конфіденційності"
          page={legal.privacy_policy}
          onChange={(privacy_policy) => updateLegal({ privacy_policy })}
        />
        <LegalPageEditor
          label="Правила сайту (мандрівники)"
          page={legal.site_rules}
          onChange={(site_rules) => updateLegal({ site_rules })}
        />
        <LegalPageEditor
          label="Правила розміщення (гіди)"
          page={legal.placement_rules}
          onChange={(placement_rules) => updateLegal({ placement_rules })}
        />
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Збереження…' : 'Зберегти контент'}
        </button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  )
}

type FieldDef = { key: string; label: string; placeholder?: string }

function ListEditor<T extends Record<string, string>>({
  title,
  items,
  onChange,
  fields,
}: {
  title: string
  items: T[]
  onChange: (items: T[]) => void
  fields: FieldDef[]
}) {
  const empty = () => Object.fromEntries(fields.map((f) => [f.key, ''])) as T

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-ink">{title}</h3>
        <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => onChange([...items, empty()])}>
          + Додати
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border p-3 space-y-2">
          {fields.map((f) => (
            <label key={f.key} className="block text-sm text-muted">
              {f.label}
              <input
                className="input mt-1"
                value={item[f.key as keyof T] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => {
                  const next = [...items]
                  next[i] = { ...next[i], [f.key]: e.target.value }
                  onChange(next)
                }}
              />
            </label>
          ))}
          <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Видалити
          </button>
        </div>
      ))}
    </section>
  )
}

function FooterColumnsEditor({
  columns,
  onChange,
}: {
  columns: FooterContent['columns']
  onChange: (columns: FooterContent['columns']) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Колонки посилань</p>
        <button
          type="button"
          className="text-sm text-brand-700 hover:underline"
          onClick={() => onChange([...columns, { title: 'Нова колонка', links: [{ label: 'Посилання', url: '/' }] }])}
        >
          + Колонка
        </button>
      </div>
      {columns.map((col, ci) => (
        <div key={ci} className="rounded-xl border border-border p-3 space-y-2">
          <input
            className="input"
            value={col.title}
            onChange={(e) => {
              const next = [...columns]
              next[ci] = { ...next[ci], title: e.target.value }
              onChange(next)
            }}
            placeholder="Заголовок колонки"
          />
          {col.links.map((link, li) => (
            <div key={li} className="grid gap-2 sm:grid-cols-2">
              <input
                className="input"
                value={link.label}
                onChange={(e) => {
                  const next = [...columns]
                  const links = [...next[ci].links]
                  links[li] = { ...links[li], label: e.target.value }
                  next[ci] = { ...next[ci], links }
                  onChange(next)
                }}
                placeholder="Текст"
              />
              <input
                className="input"
                value={link.url}
                onChange={(e) => {
                  const next = [...columns]
                  const links = [...next[ci].links]
                  links[li] = { ...links[li], url: e.target.value }
                  next[ci] = { ...next[ci], links }
                  onChange(next)
                }}
                placeholder="/path або https://"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button
              type="button"
              className="text-xs text-brand-700 hover:underline"
              onClick={() => {
                const next = [...columns]
                next[ci] = { ...next[ci], links: [...next[ci].links, { label: 'Нове', url: '/' }] }
                onChange(next)
              }}
            >
              + Посилання
            </button>
            <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onChange(columns.filter((_, i) => i !== ci))}>
              Видалити колонку
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
