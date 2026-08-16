import { useRef, useState } from 'react'
import { adminApi, resolveMediaUrl } from '../api/client'
import { formatBytes, readFileAsDataUrl, type RasterFormat } from '../lib/imageProcess'
import { ImageCropModal } from './ImageCropModal'

export type ImageUrlFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  /** Увімкнути обрізку перед завантаженням */
  cropAspect?: number
  /** Цільовий розмір файлу після стиснення */
  maxBytes?: number
  /** Примусовий формат для гідів / аватарів */
  outputFormat?: RasterFormat
}

export function ImageUrlField({
  label,
  value,
  onChange,
  hint,
  cropAspect = 1,
  maxBytes = 150 * 1024,
  outputFormat = 'webp',
}: ImageUrlFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [lastSize, setLastSize] = useState<number | null>(null)
  const preview = value ? resolveMediaUrl(value) : ''

  const upload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const { public_key } = await adminApi.uploadMedia(file)
      onChange(public_key)
      setLastSize(file.size)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setUploading(false)
    }
  }

  const onFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Оберіть файл зображення')
      return
    }
    setError('')
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setCropSrc(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка читання файлу')
    }
  }

  const defaultHint =
    hint ??
    `Обрізка ${cropAspect === 1 ? '1:1' : ''}, ${outputFormat === 'jpeg' ? 'JPEG' : 'WebP/JPEG'}, ціль ~${formatBytes(maxBytes)}`

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm text-muted">
          {label}
          <input
            className="input mt-1"
            value={value}
            placeholder="https://… або завантажте файл"
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted-light">{defaultHint}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary py-2 text-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Завантаження…' : 'Завантажити та обрізати'}
          </button>
          {value && (
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => { onChange(''); setLastSize(null) }}>
              Видалити
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFileSelected(file)
              e.target.value = ''
            }}
          />
          {preview && (
            <img src={preview} alt="" className="h-16 w-16 rounded-2xl object-cover border border-border" />
          )}
        </div>
        {lastSize != null && (
          <p className="text-xs text-muted-light">Останнє завантаження: {formatBytes(lastSize)}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropAspect}
          outputFormat={outputFormat}
          maxBytes={maxBytes}
          title="Обрізка фото"
          onCancel={() => setCropSrc(null)}
          onComplete={(file) => {
            setCropSrc(null)
            void upload(file)
          }}
        />
      )}
    </>
  )
}
