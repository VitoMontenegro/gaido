import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { adminApi, formatApiError, resolveMediaUrl } from '@gaido/api-client/api/client'
import {
  createCropImageSource,
  isLikelyImageFile,
  type CropImageSource,
  type ProcessedImage,
  type RasterFormat,
} from '../lib/imageProcess'
import { ImageCropModal } from './ImageCropModal'

const DRAG_THRESHOLD_PX = 8

type Props = {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  hint?: string
  cropAspect?: number
  maxBytes?: number
  outputFormat?: RasterFormat
  showCover?: boolean
}

type DragState = {
  fromIndex: number
  pointerId: number
  startX: number
  startY: number
  active: boolean
  ghostRect: { width: number; height: number }
  ghostX: number
  ghostY: number
  ghostUrl: string
  dropIndex: number
}

const initialDragState = (): DragState => ({
  fromIndex: -1,
  pointerId: -1,
  startX: 0,
  startY: 0,
  active: false,
  ghostRect: { width: 0, height: 0 },
  ghostX: 0,
  ghostY: 0,
  ghostUrl: '',
  dropIndex: -1,
})

function findDropIndex(clientX: number, clientY: number): number {
  const el = document.elementFromPoint(clientX, clientY)
  const item = el?.closest('[data-gallery-index]')
  if (!item) return -1
  const index = Number(item.getAttribute('data-gallery-index'))
  return Number.isFinite(index) ? index : -1
}

export default function GalleryField({
  label,
  value,
  onChange,
  hint,
  cropAspect = 4 / 3,
  maxBytes = 400 * 1024,
  outputFormat = 'webp',
  showCover = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const cropRef = useRef<CropImageSource | null>(null)
  const pendingRef = useRef<File[]>([])
  const dragRef = useRef<DragState>(initialDragState())

  const [uploading, setUploading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [currentCrop, setCurrentCrop] = useState<CropImageSource | null>(null)
  const [cropDone, setCropDone] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragFromIndex, setDragFromIndex] = useState(-1)
  const [dropIndex, setDropIndex] = useState(-1)
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number; height: number; url: string } | null>(null)

  const revokeCrop = () => {
    cropRef.current?.revoke()
    cropRef.current = null
    setCurrentCrop(null)
  }

  const clearCropSession = () => {
    revokeCrop()
    pendingRef.current = []
    setPendingFiles([])
    setCropDone(0)
  }

  const appendKey = (publicKey: string) => {
    const next = [...valueRef.current, publicKey]
    valueRef.current = next
    onChange(next)
  }

  const uploadFile = async (file: ProcessedImage | File) => {
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

  const showNextCrop = async (files: File[]) => {
    if (files.length === 0) {
      revokeCrop()
      return
    }
    const [next, ...rest] = files
    pendingRef.current = rest
    setPendingFiles(rest)
    setPreparing(true)
    try {
      revokeCrop()
      const source = await createCropImageSource(next)
      cropRef.current = source
      setCurrentCrop(source)
    } catch (e) {
      clearCropSession()
      setError(e instanceof Error ? e.message : 'Помилка читання файлу')
    } finally {
      setPreparing(false)
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
      setCropDone(0)
      await showNextCrop(files)
      return
    }

    await uploadMany(files)
  }

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= valueRef.current.length) return
    const next = [...valueRef.current]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    valueRef.current = next
    onChange(next)
  }

  const removeAt = (index: number) => {
    const next = valueRef.current.filter((_, j) => j !== index)
    valueRef.current = next
    onChange(next)
  }

  const resetDrag = () => {
    dragRef.current = initialDragState()
    setDragging(false)
    setDragFromIndex(-1)
    setDropIndex(-1)
    setGhost(null)
  }

  const finishDrag = (pointerId: number) => {
    const drag = dragRef.current
    if (drag.pointerId !== pointerId) return

    if (drag.active && drag.fromIndex >= 0 && drag.dropIndex >= 0) {
      move(drag.fromIndex, drag.dropIndex)
    }
    resetDrag()
  }

  const updateDrag = (e: PointerEvent) => {
    const drag = dragRef.current
    if (drag.pointerId !== e.pointerId || drag.fromIndex < 0) return

    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY

    if (!drag.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      drag.active = true
      setDragging(true)
      setDragFromIndex(drag.fromIndex)
      setDropIndex(drag.fromIndex)
      setGhost({
        x: e.clientX,
        y: e.clientY,
        width: drag.ghostRect.width,
        height: drag.ghostRect.height,
        url: drag.ghostUrl,
      })
    }

    e.preventDefault()
    drag.ghostX = e.clientX
    drag.ghostY = e.clientY
    const nextDrop = findDropIndex(e.clientX, e.clientY)
    drag.dropIndex = nextDrop >= 0 ? nextDrop : drag.dropIndex
    setGhost({
      x: e.clientX,
      y: e.clientY,
      width: drag.ghostRect.width,
      height: drag.ghostRect.height,
      url: drag.ghostUrl,
    })
    setDropIndex(drag.dropIndex)
  }

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => updateDrag(e)
    const onPointerUp = (e: PointerEvent) => finishDrag(e.pointerId)
    const onPointerCancel = (e: PointerEvent) => finishDrag(e.pointerId)

    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [])

  const onTilePointerDown = (index: number, url: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return

    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      fromIndex: index,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      ghostRect: { width: rect.width, height: rect.height },
      ghostX: e.clientX,
      ghostY: e.clientY,
      ghostUrl: url,
      dropIndex: index,
    }
  }

  const cropTotal = cropDone + (currentCrop ? 1 : 0) + pendingFiles.length
  const cropTitle =
    cropTotal > 1 ? `Обрізка фото ${cropDone + 1} з ${cropTotal}` : 'Обрізка фото'

  return (
    <div className="space-y-2">
      <div>
        <h3 className="font-semibold text-ink">{label}</h3>
        {hint && <p className="mt-1 text-sm text-stone-600">{hint}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {value.length > 0 ? (
        <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${dragging ? 'select-none' : ''}`}>
          {value.map((url, i) => (
            <li key={`${url}-${i}`} data-gallery-index={i} className={`min-w-0 overflow-hidden rounded-xl border border-border bg-white ${dragFromIndex === i ? 'opacity-40' : ''} ${dragging && dropIndex === i && dragFromIndex !== i ? 'ring-2 ring-teal' : ''}`}>
              <div className={`relative aspect-[4/3] bg-stone-100 ${value.length > 1 ? 'touch-none' : ''}`} onPointerDown={(e) => onTilePointerDown(i, url, e)}>
                <img src={resolveMediaUrl(url)} alt={`Фото ${i + 1}`} draggable={false} className="pointer-events-none h-full w-full object-cover" />
                {showCover && i === 0 && <span className="absolute left-2 top-2 rounded-lg bg-ink/85 px-2 py-1 text-xs font-medium text-white">Обкладинка</span>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 p-2">
                <span className="text-xs font-medium text-stone-600">Фото {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg disabled:opacity-30" disabled={i === 0 || uploading || preparing} onClick={() => move(i, i - 1)} aria-label={`Перемістити фото ${i + 1} раніше`}>←</button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg disabled:opacity-30" disabled={i === value.length - 1 || uploading || preparing} onClick={() => move(i, i + 1)} aria-label={`Перемістити фото ${i + 1} пізніше`}>→</button>
                </div>
                {showCover && i > 0 && <button type="button" className="w-full rounded-lg bg-sand-50 px-2 py-2 text-left text-xs font-medium text-ink" onClick={() => move(i, 0)}>Зробити обкладинкою</button>}
                <button type="button" className="min-h-9 w-full text-left text-xs text-red-700" onClick={() => removeAt(i)} aria-label={`Видалити фото ${i + 1}`}>Видалити фото</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-sand-50 px-4 py-5 text-center text-sm text-stone-600">Фото ще немає. Оберіть зображення з телефону або комп’ютера.</div>
      )}
      {value.length > 1 && <p className="text-sm text-stone-600">Змінюйте порядок стрілками або перетягніть фото.</p>}
      <button type="button" className="btn-secondary w-full sm:w-auto" disabled={uploading || preparing || currentCrop != null} onClick={() => inputRef.current?.click()}>
        {uploading ? 'Завантаження…' : preparing ? 'Підготовка фото…' : value.length ? '+ Додати ще фото' : '+ Обрати фото'}
      </button>
      <p className="text-sm text-stone-500">Можна обрати декілька фото. Після вибору перевірте обрізку кожного з них.</p>

      {ghost && (
        <div
          className="pointer-events-none fixed z-50 overflow-hidden rounded-lg border-2 border-sky-400 shadow-lg"
          style={{
            width: ghost.width,
            height: ghost.height,
            left: ghost.x - ghost.width / 2,
            top: ghost.y - ghost.height / 2,
          }}
        >
          <img src={resolveMediaUrl(ghost.url)} alt="" className="h-full w-full object-cover" draggable={false} />
        </div>
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

      {currentCrop && (
        <ImageCropModal
          imageSrc={currentCrop.url}
          aspect={cropAspect}
          outputFormat={outputFormat}
          maxBytes={maxBytes}
          title={cropTitle}
          onCancel={clearCropSession}
          onComplete={(file) => {
            void (async () => {
              setUploading(true)
              setError('')
              try {
                await uploadFile(file)
                setCropDone((n) => n + 1)
                revokeCrop()
                await showNextCrop(pendingRef.current)
              } catch (e) {
                setError(formatApiError(e))
                clearCropSession()
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
