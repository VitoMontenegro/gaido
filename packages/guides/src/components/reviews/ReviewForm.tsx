import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveMediaUrl } from '@gaido/api-client/api/client'
import { reviewsApi } from '@gaido/api-client/api/reviews'
import { useMe } from '@gaido/api-client/hooks/useAuth'
import ApiErrorBanner from '../ApiErrorBanner'
import type { ExcursionItem } from '../excursionUi'
import StarRating from './StarRating'

const MAX_PHOTOS = 8

export default function ReviewForm({
  excursions,
  fixedExcursionId,
  onSubmit,
  submitting,
  error,
  success,
}: {
  excursions?: ExcursionItem[]
  fixedExcursionId?: number
  onSubmit: (v: { excursion_id: number; rating: number; text: string; photos: string[] }) => void
  submitting?: boolean
  error?: unknown
  success?: boolean
}) {
  const { data: me } = useMe()
  const location = useLocation()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const list = excursions ?? []
  const [rating, setRating] = useState(5)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (success) {
      formRef.current?.reset()
      setRating(5)
      setPhotos([])
      setUploadError(null)
    }
  }, [success])

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(null)
    setUploading(true)
    try {
      const next = [...photos]
      for (const file of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break
        const { public_key } = await reviewsApi.uploadPhoto(file)
        next.push(public_key)
      }
      setPhotos(next)
    } catch {
      setUploadError('Не вдалося завантажити фото. Спробуйте ще раз.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!fixedExcursionId && list.length === 0) {
    return (
      <p className="card text-sm text-stone-600">
        Відгуки можна залишити лише після появи опублікованих екскурсій.
      </p>
    )
  }

  if (!me) {
    return (
      <p className="card text-sm text-stone-600">
        <Link to="/login" state={{ from: location.pathname }} className="link-accent">
          Увійдіть в акаунт
        </Link>
        , щоб залишити відгук.
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const excursionId = fixedExcursionId ?? Number(fd.get('excursion_id'))
        if (!excursionId) return
        onSubmit({
          excursion_id: excursionId,
          rating,
          text: String(fd.get('text') ?? ''),
          photos,
        })
      }}
    >
      <p className="text-sm font-medium text-stone-900">Залишити відгук</p>
      <ApiErrorBanner
        error={error}
        hint={{
          UNAUTHORIZED: 'Увійдіть в акаунт, щоб залишити відгук',
          CONFLICT: 'Ви вже залишили відгук на цю екскурсію',
          REVIEW_ALREADY_EXISTS: 'Ви вже залишили відгук на цю екскурсію',
        }}
      />
      {success && !error && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Дякуємо! Відгук надіслано на модерацію.
        </p>
      )}
      {!fixedExcursionId && (
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Екскурсія</span>
          <select name="excursion_id" className="input" required defaultValue="" disabled={submitting || uploading}>
            <option value="" disabled>Оберіть екскурсію</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center space-x-4">
        <span className=" text-stone-600">Оцініть враження</span>
        <StarRating
          value={rating}
          interactive
          size="lg"
          onChange={setRating}
          ariaLabel="Оцінка відгуку"
        />
      </div>

      <textarea
        name="text"
        className="input min-h-24"
        placeholder="Поділіться враженнями від екскурсії"
        required
        disabled={submitting || uploading}
      />

      <div className="space-y-2">
        <p className="text-sm text-stone-600">
          Фото з екскурсії <span className="text-stone-400">(необовʼязково, до {MAX_PHOTOS})</span>
        </p>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((key) => (
              <div key={key} className="relative h-16 w-16 overflow-hidden rounded-lg border border-stone-200">
                <img src={resolveMediaUrl(key)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
                  disabled={submitting || uploading}
                  onClick={() => setPhotos((prev) => prev.filter((k) => k !== key))}
                  aria-label="Видалити фото"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        {photos.length < MAX_PHOTOS && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={submitting || uploading}
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={submitting || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Завантаження…' : 'Додати фото'}
            </button>
          </>
        )}
      </div>

      <button type="submit" className="btn-primary" disabled={submitting || uploading}>
        {submitting ? 'Надсилання…' : 'Надіслати'}
      </button>
    </form>
  )
}
