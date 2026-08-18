import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { formatBytes, processCroppedImage, type ProcessedImage, type ProcessImageOptions, type RasterFormat } from '../lib/imageProcess'

type ImageCropModalProps = {
  imageSrc: string
  aspect: number
  title?: string
  outputFormat?: RasterFormat
  maxBytes?: number
  onCancel: () => void
  onComplete: (file: ProcessedImage) => void
}

export function ImageCropModal({
  imageSrc,
  aspect,
  title = 'Обрізка фото',
  outputFormat,
  maxBytes,
  onCancel,
  onComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels)
  }, [])

  const confirm = async () => {
    if (!area) return
    setBusy(true)
    setError('')
    try {
      const opts: ProcessImageOptions = {
        format: outputFormat,
        maxBytes,
        filename: 'photo',
      }
      const file = await processCroppedImage(imageSrc, area, opts)
      onComplete(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка обробки')
    } finally {
      setBusy(false)
    }
  }

  const targetLabel = formatBytes(maxBytes ?? 150 * 1024)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-medium uppercase text-ink">{title}</h3>
          <button type="button" className="text-sm text-muted hover:text-ink" onClick={onCancel}>
            Скасувати
          </button>
        </div>

        <div className="relative h-72 overflow-hidden rounded-2xl bg-sand-100">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="mt-4 block text-sm text-muted">
          Масштаб
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-brand-500"
          />
        </label>

        <p className="mt-2 text-xs text-muted-light">
          Після обрізки збережемо як {outputFormat === 'jpeg' ? 'JPEG' : 'WebP/JPEG'} (~{targetLabel}, якщо можливо без втрати якості).
        </p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Скасувати
          </button>
          <button type="button" className="btn-primary" onClick={() => void confirm()} disabled={busy || !area}>
            {busy ? 'Обробка…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}
