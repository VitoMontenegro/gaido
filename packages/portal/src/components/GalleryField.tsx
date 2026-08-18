import { useRef, useState } from 'react'
import { adminApi, formatApiError, resolveMediaUrl } from '@gaido/api-client/api/client'
import { isLikelyImageFile, readFileAsDataUrl, type ProcessedImage, type RasterFormat } from '../lib/imageProcess'
import { ImageCropModal } from './ImageCropModal'

type Props = {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  hint?: string
  cropAspect?: number
  maxBytes?: number
  outputFormat?: RasterFormat
}

export default function GalleryField({
  label,
  value,
  onChange,
  hint,
  cropAspect = 4 / 3,
  maxBytes = 400 * 1024,
  outputFormat = 'webp',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [cropQueue, setCropQueue] = useState<string[]>([])
  const [cropDone, setCropDone] = useState(0)

  const appendKey = (publicKey: string) => {
    const next = [...valueRef.current, publicKey]
    valueRef.current = next
    onChange(next)
  }

  const uploadFile = async (file: ProcessedImage) => {
    const { public_key } = await adminApi.uploadMedia(file)
    appendKey(public_key)
  }

  const uploadMany = async (files: File[]) => {
    setUploading(true)
    setError('')
    try {
      for (const file of files) {
        await uploadFile(file)
      }
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setUploading(false)
    }
  }

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return

    const files = Array.from(fileList).filter(isLikelyImageFile)
    if (files.length === 0) {
      setError('Потрібен файл зображення')
      return
    }

    setError('')

    if (cropAspect) {
      try {
        const dataUrls = await Promise.all(files.map((file) => readFileAsDataUrl(file)))
        setCropDone(0)
        setCropQueue(dataUrls)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Помилка читання файлу')
      }
      return
    }

    await uploadMany(files)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    valueRef.current = next
    onChange(next)
  }

  const cropTotal = cropDone + cropQueue.length
  const cropTitle =
    cropQueue.length > 1
      ? `Обрізка фото ${cropDone + 1} з ${cropTotal}`
      : 'Обрізка фото'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="form-field-label">{label}</span>
        <button
          type="button"
          className="excursion-parus-link disabled:opacity-50"
          disabled={uploading || cropQueue.length > 0}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Завантаження…' : '+ Додати зображення'}
        </button>
      </div>
      {hint && <p className="form-field-hint">{hint}</p>}
      <p className="form-field-hint">Можна обрати кілька файлів одразу.</p>
      {error && <p className="text-base text-red-600">{error}</p>}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <li key={`${url}-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-stone-100">
              <img src={resolveMediaUrl(url)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-0.5 bg-black/50 p-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label="Вліво"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-700"
                  onClick={() => {
                    const next = value.filter((_, j) => j !== i)
                    valueRef.current = next
                    onChange(next)
                  }}
                  aria-label="Видалити"
                >
                  ×
                </button>
                <button
                  type="button"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-xs"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label="Вправо"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFilesSelected(e.target.files)
          e.target.value = ''
        }}
      />

      {cropQueue[0] && (
        <ImageCropModal
          imageSrc={cropQueue[0]}
          aspect={cropAspect}
          outputFormat={outputFormat}
          maxBytes={maxBytes}
          title={cropTitle}
          onCancel={() => {
            setCropQueue([])
            setCropDone(0)
          }}
          onComplete={(file) => {
            void (async () => {
              setUploading(true)
              setError('')
              try {
                await uploadFile(file)
                setCropDone((n) => n + 1)
                setCropQueue((queue) => queue.slice(1))
              } catch (e) {
                setError(formatApiError(e))
                setCropQueue([])
                setCropDone(0)
              } finally {
                setUploading(false)
              }
            })()
          }}
        />
      )}
    </div>
  )
}
