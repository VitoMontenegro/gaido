import { lazy, Suspense, useState, type ReactNode } from 'react'
import { normalizeItems } from '../lib/bookingTerms'
import { resolveMapEmbed } from '../lib/mapEmbed'
import BookingTermsEditor from './BookingTermsEditor'
import CityPicker from './CityPicker'
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
}

type Props = {
  initial?: Partial<ExcursionFormData>
  submitLabel: string
  onSubmit: (data: ExcursionFormData) => Promise<void>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  )
}

export default function ExcursionForm({ initial, submitLabel, onSubmit }: Props) {
  const [cityId, setCityId] = useState(initial?.city_id ?? 0)
  const [cover, setCover] = useState(initial?.cover_image_url ?? '')
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html || initial?.description || '')
  const [bookingHtml, setBookingHtml] = useState(initial?.organizational_details ?? '')
  const [included, setIncluded] = useState(() => normalizeItems(initial?.included_items))
  const [excluded, setExcluded] = useState(() => normalizeItems(initial?.excluded_items))
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const description = String(fd.get('description') ?? '')
        setSubmitting(true)
        try {
          await onSubmit({
            title: String(fd.get('title')),
            description,
            city_id: cityId,
            type: String(fd.get('type')),
            max_guests: Number(fd.get('max_guests')),
            price_from: Number(fd.get('price_from')),
            currency: 'EUR',
            duration_minutes: Number(fd.get('duration_minutes')),
            transport_mode: String(fd.get('transport_mode')),
            children_allowed: fd.get('children_allowed') === 'on',
            language: String(fd.get('language')),
            organizational_details: bookingHtml,
            meeting_point: String(fd.get('meeting_point')),
            included_items: included,
            excluded_items: excluded,
            cover_image_url: cover,
            body_html: bodyHtml || `<p>${description}</p>`,
            map_embed_url: resolveMapEmbed(String(fd.get('map_embed_url') ?? '')) ?? '',
          })
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <Field label="Назва">
        <input name="title" className="input w-full" defaultValue={initial?.title} required />
      </Field>

      <Field label="Короткий опис" hint="Показується в картках каталогу">
        <textarea name="description" className="input min-h-24 w-full" defaultValue={initial?.description} required />
      </Field>

      <ImageUrlField
        label="Обкладинка"
        value={cover}
        onChange={setCover}
        cropAspect={16 / 10}
        maxBytes={400 * 1024}
        hint="Головне фото сторінки екскурсії"
      />

      <Field
        label="Програма та опис"
        hint="Сюди текст, фото (таблиця 2×1 для пари як на Olimpus), відео. Карту можна вставити кнопкою Media або окремим полем нижче."
      >
        <Suspense fallback={<div className="input min-h-[420px] text-sm text-stone-500">Завантаження редактора…</div>}>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} disabled={submitting} />
        </Suspense>
      </Field>

      <Field
        label="Карта маршруту (опційно)"
        hint="Лише embed URL або HTML &lt;iframe&gt; (Google Maps / OSM / Яндекс). Абзаци на кшталт «Це справжній скарб…» — у «Програму», не сюди. Карту можна також вставити в редактор через Media."
      >
        <textarea
          name="map_embed_url"
          className="input min-h-20 w-full font-mono text-sm"
          defaultValue={resolveMapEmbed(initial?.map_embed_url) ?? ''}
          placeholder='https://www.google.com/maps/embed?pb=... або <iframe src="..."></iframe>'
          onBlur={(ev) => {
            const raw = ev.target.value
            const ok = resolveMapEmbed(raw)
            if (raw.trim() && !ok) {
              ev.target.value = ''
              ev.target.setCustomValidity('Потрібен embed карти, не звичайний текст')
              ev.target.reportValidity()
              ev.target.setCustomValidity('')
            } else if (ok) {
              ev.target.value = ok
            }
          }}
        />
      </Field>

      <Field label="Країна та місто">
        <CityPicker value={cityId} onChange={setCityId} required />
      </Field>

      <Field label="Формат">
        <select name="type" className="input w-full" defaultValue={initial?.type ?? 'INDIVIDUAL'}>
          <option value="INDIVIDUAL">Індивідуальна</option>
          <option value="GROUP">Групова</option>
        </select>
      </Field>

      <Field label="Максимум гостей">
        <input name="max_guests" type="number" min={1} className="input w-full" defaultValue={initial?.max_guests ?? 4} required />
      </Field>

      <Field label="Ціна від, €">
        <input name="price_from" type="number" min={0} step="1" className="input w-full" defaultValue={initial?.price_from} required />
      </Field>

      <Field label="Тривалість, хв" hint="Наприклад: 180 = 3 години">
        <input name="duration_minutes" type="number" min={30} step={15} className="input w-full" defaultValue={initial?.duration_minutes ?? 180} required />
      </Field>

      <Field label="Спосіб пересування">
        <select name="transport_mode" className="input w-full" defaultValue={initial?.transport_mode ?? 'WALKING'}>
          <option value="WALKING">Пішки</option>
          <option value="CAR">На автомобілі</option>
          <option value="TRANSPORT">На транспорті</option>
          <option value="BOAT">На човні</option>
          <option value="MIXED">Пішки та транспортом</option>
        </select>
      </Field>

      <Field label="Мова екскурсії">
        <select name="language" className="input w-full" defaultValue={initial?.language ?? 'uk'}>
          <option value="uk">Українська</option>
          <option value="ru">Російська</option>
          <option value="en">English</option>
        </select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input name="children_allowed" type="checkbox" defaultChecked={initial?.children_allowed ?? true} />
        Можна з дітьми
      </label>

      <BookingTermsEditor
        included={included}
        excluded={excluded}
        onIncludedChange={setIncluded}
        onExcludedChange={setExcluded}
        disabled={submitting}
        notes={
          <Suspense fallback={<div className="input min-h-[220px] text-sm text-stone-500">Завантаження редактора…</div>}>
            <RichTextEditor value={bookingHtml} onChange={setBookingHtml} disabled={submitting} />
          </Suspense>
        }
      />

      <Field label="Місце зустрічі">
        <textarea name="meeting_point" className="input min-h-20 w-full" defaultValue={initial?.meeting_point} />
      </Field>

      <button type="submit" className="btn-primary" disabled={!cityId || submitting}>
        {submitting ? 'Збереження…' : submitLabel}
      </button>
    </form>
  )
}
