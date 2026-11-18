import { track } from '../lib/analytics'
import { useSaveNotification } from '@gaido/ui-primitives/SaveNotification'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { lazyRichTextEditor } from '@gaido/ui-primitives/lazyRichTextEditor'
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
import ExcursionVideoField from './ExcursionVideoField'
import AiImproveButton, { keepMediaBlocks } from './AiImproveButton'
import { videoLinkProblem, videoSource } from '../lib/videoSource'
import ExcursionDatesEditor from './ExcursionDatesEditor'
import { descriptionFromHtml } from './excursionUi'
import { asHtml } from '../lib/html'
import { ROUTE_STOP_MAX_LENGTH, nextRouteStop, routeStopLength } from '../lib/routeStop'
import { durationPartsToMinutes, minutesToDurationParts } from '../lib/duration'

const RichTextEditor = lazyRichTextEditor(() => import('./RichTextEditor'))

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
  description_html?: string
  map_embed_url: string
  structured_content: ExcursionStructuredContent
}

type TabId = 'basic' | 'media' | 'route' | 'video' | 'locations' | 'comfort' | 'program' | 'terms' | 'review'

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Основне' },
  { id: 'media', label: 'Фото і відео' },
  { id: 'route', label: 'Маршрут' },
  { id: 'terms', label: 'Умови' },
  { id: 'review', label: 'Перевірка' },
]

const normalizeTab = (tab: string): TabId => {
  if (tab === 'video' || tab === 'locations') return 'media'
  if (tab === 'comfort' || tab === 'program') return 'route'
  return TABS.some((item) => item.id === tab) ? tab as TabId : 'basic'
}

export type ExcursionPhotoPersist = {
  cover_image_url: string
  structured_content: ExcursionStructuredContent
  draft: ExcursionFormData
}

export function excursionWritePayload(e: Partial<ExcursionFormData>): ExcursionFormData {
  return {
    title: e.title ?? '',
    description: e.description ?? '',
    city_id: e.city_id ?? 0,
    type: e.type ?? 'INDIVIDUAL',
    max_guests: e.max_guests ?? 4,
    price_from: e.price_from ?? 0,
    currency: e.currency ?? 'EUR',
    duration_minutes: e.duration_minutes ?? 180,
    transport_mode: e.transport_mode ?? 'WALKING',
    children_allowed: e.children_allowed ?? true,
    language: e.language ?? DEFAULT_EXCURSION_LANGUAGE,
    organizational_details: e.organizational_details ?? '',
    meeting_point: e.meeting_point ?? '',
    included_items: e.included_items ?? [],
    excluded_items: e.excluded_items ?? [],
    cover_image_url: e.cover_image_url ?? '',
    body_html: e.body_html ?? '',
    description_html: e.description_html,
    map_embed_url: e.map_embed_url ?? '',
    structured_content: sanitizeStructuredContentForSave(normalizeStructuredContent(e.structured_content)),
  }
}

type Props = {
  initial?: Partial<ExcursionFormData>
  submitLabel: string
  successMessage?: string
  /** `nextTab` — крок, на який переходить гід після «Далі» (для сторінки створення). */
  onSubmit: (data: ExcursionFormData, meta?: { nextTab?: string }) => Promise<void>
  /** Зберігає фото одразу, без кнопки «Зберегти». */
  onPersistPhotos?: (payload: ExcursionPhotoPersist) => Promise<void>
  /** Зберігає активну вкладку між збереженнями (id екскурсії або "new"). */
  persistTabKey?: string
  datesEditor?: {
    excursionId: number
    excursionType: string
    priceFrom: number
    currency: string
  }
  /** Дія публікації: показується лише на кроці «Перевірка». */
  publishAction?: { label: string; pending?: boolean; onPublish: () => void | Promise<void>; missing?: { code: string; step: string; message: string }[] }
}

function readStoredTab(key?: string): TabId {
  if (!key) return 'basic'
  try {
    const saved = sessionStorage.getItem(`excursion-form-tab:${key}`)
    if (saved) return normalizeTab(saved)
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

function clampDurationPart(raw: string, max?: number): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  let n = parseInt(digits, 10)
  if (!Number.isFinite(n)) return 0
  n = Math.max(0, n)
  return max != null ? Math.min(max, n) : n
}

function DurationPartInput({
  label,
  name,
  value,
  onChange,
  max,
}: {
  label: string
  name: string
  value: number
  onChange: (n: number) => void
  max?: number
}) {
  const [text, setText] = useState(() => (value === 0 ? '' : String(value)))

  useEffect(() => {
    setText(value === 0 ? '' : String(value))
  }, [value])

  return (
    <label className="space-y-1">
      <span className="form-field-hint block">{label}</span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="input w-20"
        value={text}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          setText(digits)
          onChange(clampDurationPart(digits, max))
        }}
        onBlur={() => {
          const n = clampDurationPart(text, max)
          onChange(n)
          setText(n === 0 ? '' : String(n))
        }}
      />
    </label>
  )
}

export default function ExcursionForm({ initial, submitLabel, successMessage = 'Збережено', onSubmit, onPersistPhotos, persistTabKey, datesEditor, publishAction }: Props) {
  const notify = useSaveNotification()
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
  const [type, setType] = useState(initial?.type ?? 'INDIVIDUAL')
  const [maxGuests, setMaxGuests] = useState(initial?.max_guests ?? 4)
  const [priceFrom, setPriceFrom] = useState(initial?.price_from ?? 0)
  const initialDuration = minutesToDurationParts(initial?.duration_minutes ?? 180)
  const [durationDays, setDurationDays] = useState(initialDuration.days)
  const [durationHours, setDurationHours] = useState(initialDuration.hours)
  const [durationMinutes, setDurationMinutes] = useState(initialDuration.minutes)
  const [transportMode, setTransportMode] = useState(initial?.transport_mode ?? 'WALKING')
  const [language, setLanguage] = useState(initial?.language ?? DEFAULT_EXCURSION_LANGUAGE)
  const [childrenAllowed, setChildrenAllowed] = useState(initial?.children_allowed ?? true)
  const [meetingPoint, setMeetingPoint] = useState(initial?.meeting_point ?? '')
  const [mapEmbedUrl, setMapEmbedUrl] = useState(resolveMapEmbed(initial?.map_embed_url) ?? '')
  const [cover, setCover] = useState(initial?.cover_image_url ?? '')
  const [structured, setStructured] = useState(() =>
    normalizeStructuredContent(initial?.structured_content),
  )
  const [bodyHtml, setBodyHtml] = useState(initial?.description_html?.trim() || initial?.body_html?.trim() || asHtml(initial?.description))
  const [bookingHtml, setBookingHtml] = useState(initial?.organizational_details ?? '')
  const [included, setIncluded] = useState(() => normalizeItems(initial?.included_items))
  const [excluded, setExcluded] = useState(() => normalizeItems(initial?.excluded_items))
  const [submitting, setSubmitting] = useState(false)
  const [hasUpcomingDates, setHasUpcomingDates] = useState<boolean | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'pending' | 'success' | 'error'; text: string } | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const structuredRef = useRef(structured)
  structuredRef.current = structured
  const coverRef = useRef(cover)
  coverRef.current = cover
  const persistInflight = useRef(false)
  const persistPending = useRef<ExcursionPhotoPersist | null>(null)
  const submittingRef = useRef(false)
  const cityReadyRef = useRef(cityId > 0)

  useEffect(() => {
    if (!saveFeedback) return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    if (saveFeedback.type !== 'success') return
    const timer = window.setTimeout(() => setSaveFeedback(null), 5000)
    return () => window.clearTimeout(timer)
  }, [saveFeedback])

  useEffect(() => {
    if (!photoFeedback || photoFeedback.type !== 'success') return
    const timer = window.setTimeout(() => setPhotoFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [photoFeedback])

  const updateStructured = (patch: Partial<ExcursionStructuredContent>) => {
    setStructured((prev) => normalizeStructuredContent({ ...prev, ...patch }))
  }

  const flushPhotoPersist = async () => {
    if (!onPersistPhotos || persistInflight.current || submittingRef.current) return
    persistInflight.current = true
    setPhotoFeedback({ type: 'pending', text: 'Збереження фото…' })
    try {
      while (persistPending.current && !submittingRef.current) {
        const payload = persistPending.current
        persistPending.current = null
        try {
          await onPersistPhotos(payload)
          if (!submittingRef.current) setPhotoFeedback({ type: 'success', text: 'Фото збережено' })
        } catch (err) {
          setPhotoFeedback({
            type: 'error',
            text: err instanceof Error ? err.message : 'Не вдалося зберегти фото',
          })
        }
      }
    } finally {
      persistInflight.current = false
      if (persistPending.current && !submittingRef.current) void flushPhotoPersist()
    }
  }

  const persistPhotos = (nextCover: string, nextStructured: ExcursionStructuredContent) => {
    if (!onPersistPhotos || submittingRef.current) return
    const gallery = nextStructured.gallery
    const coverUrl = nextStructured.gallery_managed ? gallery[0] ?? '' : gallery[0] ?? nextCover
    const playableVideo = videoSource(nextStructured.video?.url ?? '')
    const { video: _video, ...contentWithoutVideo } = nextStructured
    const structured_content = sanitizeStructuredContentForSave({
      ...contentWithoutVideo,
      gallery: nextStructured.gallery_managed ? gallery : gallery.length ? gallery : coverUrl ? [coverUrl] : [],
      ...(playableVideo || !(nextStructured.video?.url ?? '').trim()
        ? {
            video: playableVideo
              ? {
                  url: playableVideo.url,
                  preview_desktop: playableVideo.kind === 'file' ? nextStructured.video?.preview_desktop : undefined,
                }
              : { url: '' },
          }
        : {}),
    })
    persistPending.current = {
      cover_image_url: coverUrl,
      structured_content,
      draft: excursionWritePayload({
        title,
        description: initial?.description ?? '',
        city_id: cityId,
        type,
        max_guests: Math.max(1, Number.isFinite(maxGuests) ? maxGuests : 1),
        price_from: Number.isFinite(priceFrom) ? priceFrom : 0,
        currency: 'EUR',
        duration_minutes: Math.max(1, durationPartsToMinutes({ days: durationDays, hours: durationHours, minutes: durationMinutes }) || 180),
        transport_mode: transportMode,
        children_allowed: childrenAllowed,
        language,
        organizational_details: stripEditorArtifacts(bookingHtml),
        meeting_point: meetingPoint,
        included_items: included,
        excluded_items: excluded,
        cover_image_url: coverUrl,
        body_html: initial?.body_html ?? '',
        description_html: stripEditorArtifacts(bodyHtml),
        map_embed_url: resolveMapEmbed(mapEmbedUrl) ?? '',
        structured_content,
      }),
    }
    void flushPhotoPersist()
  }

  const commitStructured = (patch: Partial<ExcursionStructuredContent>, nextCover = coverRef.current) => {
    const next = normalizeStructuredContent({ ...structuredRef.current, ...patch, ...(patch.gallery !== undefined ? { gallery_managed: true, gallery_mobile_cover: undefined } : {}) })
    setStructured(next)
    if (patch.gallery) {
      nextCover = patch.gallery[0] ?? ''
      setCover(nextCover)
    }
    persistPhotos(nextCover, next)
  }

  useEffect(() => {
    const ready = cityId > 0
    const justBecameReady = ready && !cityReadyRef.current
    cityReadyRef.current = ready
    if (!justBecameReady || !onPersistPhotos) return
    const next = structuredRef.current
    if (!next.gallery.length && !next.photo_locations.length && !coverRef.current) return
    persistPhotos(coverRef.current, next)
  }, [cityId])

  const tabIndex = TABS.findIndex((item) => item.id === tab)
  const stepShownAt = useRef(Date.now())

  useEffect(() => {
    stepShownAt.current = Date.now()
    track('wizard_step_view', { step: tab, step_index: TABS.findIndex((item) => item.id === tab) + 1 })
  }, [tab])

  const photoCount = (structured.gallery_managed ? structured.gallery : structured.gallery.length ? structured.gallery : cover ? [cover] : []).filter((u) => u.trim()).length
  const descriptionLength = Array.from(descriptionFromHtml(bodyHtml) || '').length

  /** Обовʼязкові пункти кожного кроку (ті самі, що перевіряє сервер при публікації). */
  const requirements: { code: string; tab: TabId; text: string; done: boolean }[] = [
    { code: 'title', tab: 'basic', text: 'Назва (від 5 символів)', done: Array.from(title.trim()).length >= 5 },
    { code: 'city', tab: 'basic', text: 'Місто', done: cityId > 0 },
    { code: 'description', tab: 'basic', text: `Опис — від 150 символів (зараз ${descriptionLength})`, done: descriptionLength >= 150 },
    { code: 'price', tab: 'basic', text: 'Ціна більше нуля', done: Number.isFinite(priceFrom) && priceFrom > 0 },
    { code: 'meeting_point', tab: 'basic', text: 'Місце зустрічі', done: meetingPoint.trim().length >= 3 },
    ...(datesEditor ? [{ code: 'dates', tab: 'basic' as TabId, text: 'Хоча б одна відкрита дата в календарі', done: hasUpcomingDates !== false }] : []),
    { code: 'photos', tab: 'media', text: `Щонайменше 3 фото (зараз ${photoCount})`, done: photoCount >= 3 },
    { code: 'route', tab: 'route', text: 'Хоча б одна точка маршруту', done: structured.route_stops.some((stop) => stop.trim() !== '') },
    { code: 'terms', tab: 'terms', text: 'Хоча б один пункт у «Входить у вартість»', done: included.some((item) => item.trim() !== '') },
  ]
  const tabRequirements = requirements.filter((r) => r.tab === tab)
  const unmet = requirements.filter((r) => !r.done)
  const stepComplete = tabRequirements.every((r) => r.done)

  // Коли гід виправив усе потрібне, плашка про незаповнені поля зникає.
  useEffect(() => {
    if (stepComplete) {
      setSaveFeedback((prev) => (prev?.type === 'error' && prev.text.startsWith('Щоб перейти далі') ? null : prev))
    }
  }, [stepComplete])

  /** Зберігає форму через onSubmit. Повертає true, якщо збережено. */
  const saveCurrent = async (silent: boolean, nextTab?: string): Promise<boolean> => {
    const fail = (text: string, goTo?: TabId) => {
      if (goTo) setTab(goTo)
      setSaveFeedback({ type: 'error', text })
      return false
    }
    if (videoUploading) return fail('Дочекайтеся завершення завантаження відео.')
    const videoUrl = structured.video?.url?.trim() ?? ''
    if (videoUrl && !videoSource(videoUrl)) {
      return fail(videoLinkProblem(videoUrl) === 'instagram'
        ? 'Instagram не показуємо на сторінці — завантажте MP4 або вставте YouTube чи Vimeo.'
        : 'Перевірте посилання на відео: підходять YouTube, Vimeo та MP4.', 'media')
    }
    if (!title.trim() || !cityId) {
      return fail('Вкажіть назву та оберіть місто — без цього чернетку не створити.', 'basic')
    }
    if (tab !== 'review') {
      const open = tabRequirements.filter((r) => !r.done)
      if (open.length) return fail(`Щоб перейти далі, заповніть: ${open.map((r) => r.text.replace(/ \(зараз \d+\)/, '')).join('; ')}.`)
    }
    submittingRef.current = true
    persistPending.current = null
    setSubmitting(true)
    setSaveFeedback(null)
    try {
      while (persistInflight.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 40))
      }
      const synced = syncCoverFromGallery(cover, structured)
      await onSubmit({
        title,
        description: initial?.description ?? '',
        city_id: cityId,
        type,
        max_guests: Math.max(1, Number.isFinite(maxGuests) ? maxGuests : 1),
        price_from: Number.isFinite(priceFrom) ? priceFrom : 0,
        currency: 'EUR',
        duration_minutes: Math.max(1, durationPartsToMinutes({ days: durationDays, hours: durationHours, minutes: durationMinutes }) || 180),
        transport_mode: transportMode,
        children_allowed: childrenAllowed,
        language,
        organizational_details: stripEditorArtifacts(bookingHtml),
        meeting_point: meetingPoint,
        included_items: included,
        excluded_items: excluded,
        cover_image_url: synced.cover,
        body_html: initial?.body_html ?? '',
        description_html: stripEditorArtifacts(bodyHtml),
        map_embed_url: resolveMapEmbed(mapEmbedUrl) ?? '',
        structured_content: sanitizeStructuredContentForSave({
          ...synced.content,
          video: (() => {
            const playable = videoSource(synced.content.video?.url ?? '')
            return playable
              ? {
                  url: playable.url,
                  preview_desktop: playable.kind === 'file' ? synced.content.video?.preview_desktop : undefined,
                }
              : { url: '' }
          })(),
        }),
      }, { nextTab })
      if (!silent) {
        setSaveFeedback({ type: 'success', text: successMessage })
        notify(successMessage)
      }
      return true
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не вдалося зберегти',
      })
      return false
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  /** «Далі»: тихо зберігає поточний стан і переходить на наступний крок. */
  const goNext = async () => {
    if (submitting || videoUploading) return
    const next = TABS[tabIndex + 1]
    const ok = await saveCurrent(true, next?.id)
    track(ok ? 'wizard_next' : 'wizard_next_blocked', { step: tab, duration_ms: Date.now() - stepShownAt.current })
    if (ok && next) {
      setTab(next.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goBack = () => {
    if (tabIndex > 0) setTab(TABS[tabIndex - 1].id)
  }

  const publish = async () => {
    if (!publishAction || submitting) return
    track('publish_click', { step: 'review' })
    const ok = await saveCurrent(true)
    if (ok) await publishAction.onPublish()
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void goNext()
      }}
    >
      <p className="text-sm text-stone-600">Крок {TABS.findIndex((item) => item.id === tab) + 1} з {TABS.length}. Оберіть розділ або скористайтеся кнопками нижче.</p>
      <nav className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-2 text-base font-medium transition ${
              tab === id ? 'bg-white text-teal shadow-sm' : 'text-stone-600 hover:text-ink'
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
          <Field label="Опис екскурсії" hint="Розкажіть, що побачать гості. Початок опису з’явиться в картці екскурсії та пошукових системах.">
            <Suspense fallback={<div className="input min-h-40 form-field-hint">Завантаження редактора…</div>}>
              <RichTextEditor value={bodyHtml} onChange={setBodyHtml} disabled={submitting} />
            </Suspense>
            <AiImproveButton
              kind="excursion"
              value={bodyHtml}
              onApply={setBodyHtml}
              transform={keepMediaBlocks}
              context={{ title: title.trim() || undefined, city_id: cityId || undefined }}
              disabled={submitting}
            />
          </Field>
          <Field label="Країна та місто">
            <CityPicker value={cityId} onChange={setCityId} required />
          </Field>
          <Field label="Формат">
            <select name="type" aria-label="Формат екскурсії" aria-describedby="excursion-format-help" className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="INDIVIDUAL">Індивідуальна</option>
              <option value="GROUP">Групова</option>
            </select>
            <div id="excursion-format-help" className="mt-2 space-y-2 rounded-xl border border-border bg-sand-50 px-4 py-3 text-sm text-stone-700">
              <p><strong>Індивідуальна:</strong> ціна за всю екскурсію для групи гостей.</p>
              <p><strong>Групова:</strong> ціна за одну людину.</p>
            </div>
          </Field>
          <Field label="Максимум гостей">
            <input name="max_guests" type="number" min={1} className="input w-full" value={Number.isFinite(maxGuests) ? maxGuests : ''} onChange={(e) => setMaxGuests(e.target.valueAsNumber)} required />
          </Field>
          <Field label={type === 'GROUP' ? 'Ціна від за одну людину, €' : 'Ціна від за всю екскурсію, €'}>
            <input name="price_from" type="number" min={0} step="1" aria-label={type === 'GROUP' ? 'Ціна від за одну людину, євро' : 'Ціна від за всю екскурсію, євро'} aria-describedby="excursion-price-help" className="input w-full" value={Number.isFinite(priceFrom) ? priceFrom : ''} onChange={(e) => setPriceFrom(e.target.valueAsNumber)} required />
            <p id="excursion-price-help" className="rounded-xl bg-teal/10 px-4 py-3 text-sm font-medium text-ink" aria-live="polite">
              {type === 'GROUP' ? 'Вкажіть вартість для однієї людини.' : 'Вкажіть загальну вартість екскурсії, а не ціну за людину.'}
            </p>
          </Field>
          <Field label="Тривалість">
            <div className="flex flex-wrap items-end gap-3">
              <DurationPartInput label="Днів" name="duration_days" value={durationDays} onChange={setDurationDays} />
              <DurationPartInput label="Годин" name="duration_hours" value={durationHours} onChange={setDurationHours} max={23} />
              <DurationPartInput label="Хвилин" name="duration_minutes" value={durationMinutes} onChange={setDurationMinutes} max={59} />
            </div>
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

          {datesEditor && (
            <div className="border-t border-divider pt-5">
              <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Останній крок цієї сторінки: відкрийте дати, коли можна забронювати екскурсію. Без дат екскурсію не можна опублікувати.
              </p>
              <ExcursionDatesEditor
                excursionId={datesEditor.excursionId}
                excursionType={datesEditor.excursionType}
                priceFrom={datesEditor.priceFrom}
                currency={datesEditor.currency}
                onUpcomingChange={setHasUpcomingDates}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-4">
          {!cityId && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Щоб зберегти фото, спочатку оберіть місто на кроці «Основне».</p>}
          <GalleryField
            label="Фото екскурсії"
            value={structured.gallery_managed ? structured.gallery : structured.gallery.length ? structured.gallery : cover ? [cover] : []}
            showCover
            onChange={(gallery) => commitStructured({ gallery })}
            hint="Перше фото буде обкладинкою екскурсії в каталозі. Фото зберігаються після завантаження."
            cropAspect={16 / 10}
          />
          {photoFeedback && (
            <p role={photoFeedback.type === 'error' ? 'alert' : 'status'} className={`text-sm ${photoFeedback.type === 'error' ? 'text-red-600' : photoFeedback.type === 'success' ? 'text-emerald-700' : 'text-stone-500'}`}>
              {photoFeedback.text}
            </p>
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="space-y-4">
          <RepeaterField
            label="Маршрут"
            addLabel="Додати пункт маршруту"
            hint="Один пункт — одна назва місця. Додайте кожну локацію окремо, до 60 символів."
            items={structured.route_stops}
            onChange={(route_stops) => updateStructured({ route_stops })}
            createItem={() => ''}
            renderItem={(text, i) => (
              <div className="space-y-1">
                <input
                  className="input w-full"
                  value={text}
                  aria-label={`Назва місця ${i + 1}`}
                  aria-describedby={`route-stop-hint-${i}`}
                  placeholder="Наприклад: Готичний квартал"
                  onChange={(e) => {
                    const next = [...structured.route_stops]
                    next[i] = nextRouteStop(text, e.target.value)
                    updateStructured({ route_stops: next })
                  }}
                />
                <p id={`route-stop-hint-${i}`} className={`text-xs ${routeStopLength(text) > ROUTE_STOP_MAX_LENGTH ? 'text-amber-800' : 'text-stone-500'}`}>
                  {routeStopLength(text)}/{ROUTE_STOP_MAX_LENGTH}
                  {routeStopLength(text) > ROUTE_STOP_MAX_LENGTH && ' · Раніше збережений текст залишиться без змін. За бажанням скоротіть його до назви місця.'}
                </p>
              </div>
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

      {tab === 'media' && (
        <div className="space-y-4 rounded-xl border border-border bg-white p-4">
          <h2 className="font-display text-lg font-bold">Відео екскурсії</h2>
          <ExcursionVideoField
            value={structured.video}
            onChange={(video) => updateStructured({ video })}
            onPersist={(video) => commitStructured({ video })}
            onBusyChange={setVideoUploading}
            disabled={submitting}
          />
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-2">
          <GalleryField
            label="Фото-локації на маршруті"
            value={structured.photo_locations}
            onChange={(photo_locations) => commitStructured({ photo_locations })}
            hint="Окрема галерея локацій під основним текстом. Зберігається одразу."
            cropAspect={1}
          />
          {photoFeedback && (
            <p role={photoFeedback.type === 'error' ? 'alert' : 'status'} className={`text-sm ${photoFeedback.type === 'error' ? 'text-red-600' : photoFeedback.type === 'success' ? 'text-emerald-700' : 'text-stone-500'}`}>
              {photoFeedback.text}
            </p>
          )}
        </div>
      )}

      {tab === 'route' && (
        <RepeaterField
          label="Ваш комфорт — в пріоритеті"
          addLabel="Додати умову комфорту"
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

      {tab === 'terms' && (
        <BookingTermsEditor
          included={included}
          excluded={excluded}
          onIncludedChange={setIncluded}
          onExcludedChange={setExcluded}
          disabled={submitting}
          notes={
            <Suspense fallback={<div className="input min-h-55 form-field-hint">Завантаження редактора…</div>}>
              <RichTextEditor value={bookingHtml} onChange={setBookingHtml} disabled={submitting} />
            </Suspense>
          }
        />
      )}

      {tab === 'review' && (
        <section className="space-y-3 rounded-xl border border-border bg-sand-50 p-4">
          <h2 className="font-semibold">Перевірте основну інформацію</h2>
          <p>Назва: <strong>{title || 'Не вказано'}</strong></p>
          <p>Опис: {descriptionFromHtml(bodyHtml) || 'Не вказано'}</p>
          <p>Місто: {cityId ? 'Обрано' : 'Не обрано'}</p>
          <p>Формат: {type === 'INDIVIDUAL' ? 'Індивідуальна' : 'Групова'} · до {maxGuests} гостей</p>
          <p>Ціна від: {priceFrom} €</p>
          <button type="button" className="btn-secondary" onClick={() => setTab('basic')}>Змінити основну інформацію</button>
        </section>
      )}
      {saveFeedback && (
        <div
          ref={feedbackRef}
          role="status"
          className={`rounded-xl border px-4 py-3 text-base ${
            saveFeedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {saveFeedback.text}
        </div>
      )}

      <div className="space-y-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tab !== 'review' && tabRequirements.length > 0 && (
          <div className="rounded-xl border border-border bg-sand-50 px-4 py-3 text-sm">
            <p className="font-semibold">Обовʼязково на цьому кроці:</p>
            <ul className="mt-1 space-y-1">
              {tabRequirements.map((r) => (
                <li key={r.code} className={r.done ? 'text-emerald-700' : 'text-stone-800'}>
                  <span aria-hidden="true">{r.done ? '✓' : '○'}</span> {r.text}
                  <span className="sr-only">{r.done ? ' — виконано' : ' — не виконано'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'review' && unmet.length > 0 && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Щоб опублікувати, ще потрібно:</p>
            <ul className="mt-1 list-disc pl-5">
              {unmet.map((r) => (
                <li key={r.code}>
                  {r.text}{' '}
                  <button type="button" className="text-teal underline" onClick={() => setTab(r.tab)}>Перейти</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center gap-3">
          {tabIndex > 0 && (
            <button type="button" className="btn-secondary min-h-12 shrink-0" onClick={goBack} disabled={submitting}>← Назад</button>
          )}
          {tab !== 'review' ? (
            <button type="submit" className="btn-primary min-h-12 flex-1 text-base sm:flex-none" disabled={submitting || videoUploading}>
              {submitting ? 'Збереження…' : 'Далі'}
            </button>
          ) : publishAction ? (
            <button type="button" className="btn-primary min-h-12 flex-1 text-base sm:flex-none" disabled={submitting || publishAction.pending || videoUploading || unmet.length > 0} onClick={() => void publish()}>
              {submitting || publishAction.pending ? 'Публікація…' : publishAction.label}
            </button>
          ) : (
            <button type="button" className="btn-primary min-h-12 flex-1 text-base sm:flex-none" disabled={submitting || videoUploading} onClick={() => void saveCurrent(false)}>
              {submitting ? 'Збереження…' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
