import { useRef, useState } from 'react'
import { adminApi, api, formatApiError, resolveMediaUrl } from '@gaido/api-client/api/client'
import { buildUploadForm } from '@gaido/api-client/api/upload'
import type { ExcursionVideoContent } from '../lib/excursionStructuredContent'
import { captureVideoFrame } from '../lib/videoPoster'
import { videoLinkProblem, videoSource } from '../lib/videoSource'

type Props = {
  value?: ExcursionVideoContent
  onChange: (video: ExcursionVideoContent) => void
  onPersist: (video: ExcursionVideoContent) => void
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}

const MAX_BYTES = 50 * 1024 * 1024

export default function ExcursionVideoField({ value, onChange, onPersist, onBusyChange, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const url = value?.url ?? ''
  const source = videoSource(url)
  const linkValue = source?.kind === 'file' && !url.startsWith('http') ? '' : url
  const poster = source?.kind === 'file' && value?.preview_desktop ? resolveMediaUrl(value.preview_desktop) : ''

  const setVideo = (video: ExcursionVideoContent, persist: boolean) => {
    onChange(video)
    if (persist) onPersist(video)
  }

  const uploadPosterFallback = async (file: File) => {
    const frame = await captureVideoFrame(file)
    if (!frame) return ''
    const { public_key } = await adminApi.uploadMedia(new File([frame], 'poster.jpg', { type: 'image/jpeg' }))
    return public_key
  }

  const upload = async (file?: File) => {
    if (!file || busy) return
    setError('')
    const mp4 = /\.mp4$/i.test(file.name) || file.type === 'video/mp4'
    if (!mp4) {
      setError('Оберіть відео у форматі MP4.')
      return
    }
    if (!file.size || file.size > MAX_BYTES) {
      setError('Оберіть непорожній MP4 до 50 МБ.')
      return
    }
    setBusy(true)
    onBusyChange(true)
    try {
      const result = await api<{ public_key: string; poster_key?: string }>('/api/v1/account/guide/video', {
        method: 'POST',
        body: buildUploadForm(file),
      })
      let preview = result.poster_key?.trim() || ''
      if (!preview) {
        try {
          preview = await uploadPosterFallback(file)
        } catch {
          preview = ''
        }
      }
      setUploaded(true)
      setVideo({ url: result.public_key, preview_desktop: preview || undefined }, true)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
      onBusyChange(false)
      if (input.current) input.current.value = ''
    }
  }

  const persistLink = () => {
    const next = url.trim()
    if (!next) {
      onPersist({ url: '' })
      return
    }
    const parsed = videoSource(next)
    if (!parsed) return
    onPersist({ url: parsed.url })
  }

  const problem = videoLinkProblem(url)
  const problemText = problem === 'instagram'
    ? 'Instagram не показуємо на сторінці екскурсії. Завантажте MP4 або вставте YouTube чи Vimeo.'
    : problem === 'unsupported'
      ? 'Це посилання не можна показати на сайті. Завантажте MP4 або вставте YouTube чи Vimeo.'
      : ''

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-600">
        Завантажте ролик з телефона або вставте посилання. Для MP4 візьмемо кадр близько 8-ї секунди як прев’ю;
        для YouTube — кадр з відео. Окрему обкладинку додавати не потрібно.
      </p>
      <input
        ref={input}
        type="file"
        accept="video/mp4,.mp4"
        className="sr-only"
        tabIndex={-1}
        aria-label="Обрати MP4"
        onChange={(event) => void upload(event.target.files?.[0])}
        disabled={busy || disabled}
      />
      <button
        type="button"
        className="btn-secondary min-h-12 w-full"
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        {busy ? 'Завантажуємо відео…' : source?.kind === 'file' ? 'Замінити MP4' : 'Завантажити MP4 з телефона'}
      </button>
      <p className="text-sm text-stone-500">MP4 до 50 МБ. Довші ролики зручніше покласти на YouTube або Vimeo і вставити посилання.</p>
      <div className="flex items-center gap-3 text-sm text-stone-500">
        <span className="h-px flex-1 bg-stone-200" />
        або
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">Посилання на відео</span>
        <input
          type="url"
          className="input w-full"
          placeholder="YouTube, Vimeo або пряме посилання на MP4"
          value={linkValue}
          disabled={busy || disabled}
          onChange={(event) => {
            setUploaded(false)
            setError('')
            onChange({ url: event.target.value })
          }}
          onBlur={persistLink}
          aria-describedby="video-link-help"
        />
      </label>
      <p id="video-link-help" className="text-sm leading-relaxed text-stone-500">
        *YouTube, Vimeo або MP4. Посилання на Instagram, TikTok чи Facebook не дозволено.
      </p>
      {source?.kind === 'file' && (
        <video
          key={source.url}
          src={resolveMediaUrl(source.url)}
          poster={poster || undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-xl bg-stone-900"
          onError={() => setError('Не вдалося відтворити файл. Спробуйте MP4 з відеокодеком H.264 або посилання YouTube.')}
        />
      )}
      {problemText && (
        <p role="alert" className="text-sm text-red-700">{problemText}</p>
      )}
      {!!url && (
        <button
          type="button"
          className="btn-secondary min-h-11 w-full text-red-700"
          disabled={busy || disabled}
          onClick={() => {
            setError('')
            setUploaded(false)
            setVideo({ url: '' }, true)
          }}
        >
          Прибрати відео
        </button>
      )}
      {busy && <p role="status" className="text-sm text-stone-600">Не закривайте сторінку, доки відео завантажується.</p>}
      {uploaded && <p role="status" className="text-sm text-emerald-700">Файл завантажено. Прев’ю візьмемо з кадру близько 8-ї секунди. Якщо місто вже обрано, ролик з’явиться на сторінці сам.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
