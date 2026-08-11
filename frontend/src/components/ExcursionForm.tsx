import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { normalizeItems } from '../lib/bookingTerms'
import { resolveMapEmbed } from '../lib/mapEmbed'
import BookingTermsEditor from './BookingTermsEditor'
import CityPicker from './CityPicker'
import GalleryField from './GalleryField'
import RepeaterField from './RepeaterField'
import { DEFAULT_EXCURSION_LANGUAGE, EXCURSION_LANGUAGES } from '../lib/excursionLanguages'
import {
  normalizeStructuredContent,
  sanitizeStructuredContentForSave,
  syncCoverFromGallery,
  type ExcursionStructuredContent,
} from '../lib/excursionStructuredContent'
import { stripEditorArtifacts } from '../lib/html'
import { ImageUrlField } from './ImageUrlField'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

export type ExcursionFormData = {
  title: string
  description: string
  city_id: number
  type: string
  max_guests: number
  price_from: number
  currency: string
  duration_minutes: number
  transport_mode: string
  children_allowed: boolean
  language: string
  organizational_details: string
  meeting_point: string
  included_items: string[]
  excluded_items: string[]
  cover_image_url: string
  body_html: string
  map_embed_url: string
  structured_content: ExcursionStructuredContent
}

type TabId = 'basic' | 'media' | 'route' | 'video' | 'locations' | 'comfort' | 'program' | 'terms'

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Основне' },
  { id: 'media', label: 'Медіа' },
  { id: 'route', label: 'Маршрут' },
  { id: 'video', label: 'Відео' },
  { id: 'locations', label: 'Фото-локації' },
  { id: 'comfort', label: 'Комфорт' },
  { id: 'program', label: 'Програма' },
  { id: 'terms', label: 'Умови' },
]

type Props = {
  initial?: Partial<ExcursionFormData>
  submitLabel: string
  onSubmit: (data: ExcursionFormData) => Promise<void>
  /** Зберігає активну вкладку між збереженнями (id екскурсії або "new"). */
  persistTabKey?: string
}

function readStoredTab(key?: string): TabId {
  if (!key) return 'basic'
  try {
    const saved = sessionStorage.getItem(`excursion-form-tab:${key}`)
    if (saved && TABS.some((t) => t.id === saved)) return saved as TabId
  } catch {
    /* ignore */
  }
  return 'basic'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="form-field-label">{label}</span>
      {children}
      {hint && <p className="form-field-hint">{hint}</p>}
    </div>
  )
}

export default function ExcursionForm({ initial, submitLabel, onSubmit, persistTabKey }: Props) {
  const [tab, setTab] = useState<TabId>(() => readStoredTab(persistTabKey))

  useEffect(() => {
    if (!persistTabKey) return
    try {
      sessionStorage.setItem(`excursion-form-tab:${persistTabKey}`, tab)
    } catch {
      /* ignore */
    }
  }, [tab, persistTabKey])
  const [cityId, setCityId] = useState(initial?.city_id ?? 0)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [type, setType] = useState(initial?.type ?? 'INDIVIDUAL')
  const [maxGuests, setMaxGuests] = useState(initial?.max_guests ?? 4)
  const [priceFrom, setPriceFrom] = useState(initial?.price_from ?? 0)
  const [durationMinutes, setDurationMinutes] = useState(initial?.duration_minutes ?? 180)
  const [transportMode, setTransportMode] = useState(initial?.transport_mode ?? 'WALKING')
  const [language, setLanguage] = useState(initial?.language ?? DEFAULT_EXCURSION_LANGUAGE)
  const [childrenAllowed, setChildrenAllowed] = useState(initial?.children_allowed ?? true)
  const [meetingPoint, setMeetingPoint] = useState(initial?.meeting_point ?? '')
  const [mapEmbedUrl, setMapEmbedUrl] = useState(resolveMapEmbed(initial?.map_embed_url) ?? '')
  const [cover, setCover] = useState(initial?.cover_image_url ?? '')
  const [structured, setStructured] = useState(() =>
    normalizeStructuredContent(initial?.structured_content),
  )
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html || initial?.description || '')
  const [bookingHtml, setBookingHtml] = useState(initial?.organizational_details ?? '')
  const [included, setIncluded] = useState(() => normalizeItems(initial?.included_items))
  const [excluded, setExcluded] = useState(() => normalizeItems(initial?.excluded_items))
  const [submitting, setSubmitting] = useState(false)

  const updateStructured = (patch: Partial<ExcursionStructuredContent>) => {
    setStructured((prev) => normalizeStructuredContent({ ...prev, ...patch }))
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
          const synced = syncCoverFromGallery(cover, structured)
          await onSubmit({
            title,
            description,
            city_id: cityId,
            type,
            max_guests: Math.max(1, Number.isFinite(maxGuests) ? maxGuests : 1),
            price_from: Number.isFinite(priceFrom) ? priceFrom : 0,
            currency: 'EUR',
            duration_minutes: Math.max(30, Number.isFinite(durationMinutes) ? durationMinutes : 180),
            transport_mode: transportMode,
            children_allowed: childrenAllowed,
            language,
            organizational_details: stripEditorArtifacts(bookingHtml),
            meeting_point: meetingPoint,
            included_items: included,
            excluded_items: excluded,
            cover_image_url: synced.cover,
            body_html: stripEditorArtifacts(bodyHtml || `<p>${description}</p>`),
            map_embed_url: resolveMapEmbed(mapEmbedUrl) ?? '',
            structured_content: sanitizeStructuredContentForSave(synced.content),
          })
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <nav className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-2 text-base font-medium transition ${
              tab === id ? 'bg-white text-brand-700 shadow-sm' : 'text-stone-600 hover:text-ink'
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'basic' && (
        <div className="space-y-4">
          <Field label="Назва">
            <input name="title" className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Короткий опис" hint="Тизер на сторінці та в картках каталогу">
            <textarea name="description" className="input min-h-24 w-full" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Field>
          <Field label="Країна та місто">
            <CityPicker value={cityId} onChange={setCityId} required />
          </Field>
          <Field label="Формат">
            <select name="type" className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="INDIVIDUAL">Індивідуальна</option>
              <option value="GROUP">Групова</option>
            </select>
          </Field>
          <Field label="Максимум гостей">
            <input name="max_guests" type="number" min={1} className="input w-full" value={maxGuests} onChange={(e) => setMaxGuests(Number(e.target.value))} required />
          </Field>
          <Field label="Ціна від, €">
            <input name="price_from" type="number" min={0} step="1" className="input w-full" value={priceFrom} onChange={(e) => setPriceFrom(Number(e.target.value))} required />
          </Field>
          <Field label="Тривалість, хв" hint="Наприклад: 180 = 3 години">
            <input name="duration_minutes" type="number" min={30} step={15} className="input w-full" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} required />
          </Field>
          <Field label="Спосіб пересування">
            <select name="transport_mode" className="input w-full" value={transportMode} onChange={(e) => setTransportMode(e.target.value)}>
              <option value="WALKING">Пішки</option>
              <option value="CAR">На автомобілі</option>
              <option value="TRANSPORT">На транспорті</option>
              <option value="BOAT">На човні</option>
              <option value="MIXED">Пішки та транспортом</option>
            </select>
          </Field>
          <Field label="Мова екскурсії">
            <select name="language" className="input w-full" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {EXCURSION_LANGUAGES.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-base text-ink">
            <input name="children_allowed" type="checkbox" checked={childrenAllowed} onChange={(e) => setChildrenAllowed(e.target.checked)} />
            Можна з дітьми
          </label>
          <Field label="Місце зустрічі">
            <textarea name="meeting_point" className="input min-h-20 w-full" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} />
          </Field>
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-4">
          <GalleryField
            label="Галерея"
            value={structured.gallery}
            onChange={(gallery) => {
              updateStructured({ gallery })
              if (gallery[0]) setCover(gallery[0])
            }}
            hint="Фото в шапці сторінки. Перше фото — обкладинка в каталозі."
            cropAspect={16 / 10}
          />
          <ImageUrlField
            label="Галерея (перше фото для mobile)"
            value={structured.gallery_mobile_cover ?? ''}
            onChange={(gallery_mobile_cover) => updateStructured({ gallery_mobile_cover })}
            cropAspect={4 / 3}
            maxBytes={400 * 1024}
            hint="Якщо не заповнено — використовується перше фото галереї"
          />
          {!structured.gallery.length && (
            <ImageUrlField
              label="Обкладинка (якщо галерея порожня)"
              value={cover}
              onChange={setCover}
              cropAspect={16 / 10}
              maxBytes={400 * 1024}
            />
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="space-y-4">
          <RepeaterField
            label="Маршрут"
            hint="Пункти маршруту — «Які місця ви побачите»"
            items={structured.route_stops}
            onChange={(route_stops) => updateStructured({ route_stops })}
            createItem={() => ''}
            renderItem={(text, i) => (
              <input
                className="input w-full"
                value={text}
                placeholder="Назва локації"
                onChange={(e) => {
                  const next = [...structured.route_stops]
                  next[i] = e.target.value
                  updateStructured({ route_stops: next })
                }}
              />
            )}
          />
          <Field label="Примітка під маршрутом">
            <textarea
              className="input min-h-20 w-full"
              value={structured.route_disclaimer ?? ''}
              placeholder="Компанія залишає за собою право змінювати маршрут…"
              onChange={(e) => updateStructured({ route_disclaimer: e.target.value })}
            />
          </Field>
          <Field
            label="Карта маршруту (опційно)"
            hint="Embed URL або HTML iframe"
          >
            <textarea
              name="map_embed_url"
              className="input min-h-20 w-full font-mono"
              value={mapEmbedUrl}
              onChange={(e) => setMapEmbedUrl(e.target.value)}
              placeholder='https://www.google.com/maps/embed?pb=...'
            />
          </Field>
        </div>
      )}

      {tab === 'video' && (
        <div className="space-y-4">
          <Field label="Відео екскурсії" hint="Посилання YouTube / Vimeo або embed URL">
            <input
              className="input w-full"
              value={structured.video?.url ?? ''}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(e) =>
                updateStructured({
                  video: { ...structured.video, url: e.target.value, preview_desktop: structured.video?.preview_desktop, preview_mobile: structured.video?.preview_mobile },
                })
              }
            />
          </Field>
          <ImageUrlField
            label="Превʼю відео (desktop)"
            value={structured.video?.preview_desktop ?? ''}
            onChange={(preview_desktop) =>
              updateStructured({ video: { url: structured.video?.url ?? '', preview_desktop, preview_mobile: structured.video?.preview_mobile } })
            }
            cropAspect={16 / 9}
          />
          <ImageUrlField
            label="Превʼю відео (mobile)"
            value={structured.video?.preview_mobile ?? ''}
            onChange={(preview_mobile) =>
              updateStructured({ video: { url: structured.video?.url ?? '', preview_desktop: structured.video?.preview_desktop, preview_mobile } })
            }
            cropAspect={4 / 3}
          />
        </div>
      )}

      {tab === 'locations' && (
        <GalleryField
          label="Фото-локації на маршруті"
          value={structured.photo_locations}
          onChange={(photo_locations) => updateStructured({ photo_locations })}
          hint="Окрема галерея локацій під основним текстом"
          cropAspect={1}
        />
      )}

      {tab === 'comfort' && (
        <RepeaterField
          label="Ваш комфорт — в пріоритеті"
          items={structured.comfort_items}
          onChange={(comfort_items) => updateStructured({ comfort_items })}
          createItem={() => ({ title: '', text: '' })}
          renderItem={(item, _i, update) => (
            <div className="space-y-2">
              <input
                className="input w-full"
                value={item.title}
                placeholder="Заголовок"
                onChange={(e) => update({ title: e.target.value })}
              />
              <textarea
                className="input min-h-16 w-full"
                value={item.text}
                placeholder="Опис"
                onChange={(e) => update({ text: e.target.value })}
              />
            </div>
          )}
        />
      )}

      {tab === 'program' && (
        <Field label="Повний опис" hint="Розкривається по кнопці «Читати повністю»">
          <Suspense fallback={<div className="input min-h-[420px] form-field-hint">Завантаження редактора…</div>}>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} disabled={submitting} />
          </Suspense>
        </Field>
      )}

      {tab === 'terms' && (
        <BookingTermsEditor
          included={included}
          excluded={excluded}
          onIncludedChange={setIncluded}
          onExcludedChange={setExcluded}
          disabled={submitting}
          notes={
            <Suspense fallback={<div className="input min-h-[220px] form-field-hint">Завантаження редактора…</div>}>
              <RichTextEditor value={bookingHtml} onChange={setBookingHtml} disabled={submitting} />
            </Suspense>
          }
        />
      )}

      <button type="submit" className="btn-primary" disabled={!cityId || submitting}>
        {submitting ? 'Збереження…' : submitLabel}
      </button>
    </form>
  )
}
