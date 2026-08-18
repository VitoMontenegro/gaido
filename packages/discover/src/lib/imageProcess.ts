import type { Area } from 'react-easy-crop'
import type { UploadFile } from '@gaido/api-client/api/upload'

export type RasterFormat = 'webp' | 'jpeg'
export type ProcessedImage = UploadFile

export type ProcessImageOptions = {
  format?: RasterFormat
  maxBytes?: number
  maxDimension?: number
  filename?: string
}

export type CropImageSource = {
  url: string
  revoke: () => void
}

const DEFAULT_MAX_BYTES = 150 * 1024
const DEFAULT_MAX_DIMENSION = 1200
/** Max side for crop preview — avoids decoding 12MP+ photos in memory. */
const CROP_PREVIEW_MAX_DIMENSION = 2048

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не вдалося завантажити зображення'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

function pickMime(format: RasterFormat | undefined): { mime: string; ext: string; format: RasterFormat } {
  if (format === 'jpeg') return { mime: 'image/jpeg', ext: 'jpg', format: 'jpeg' }
  if (format === 'webp' && supportsWebP()) return { mime: 'image/webp', ext: 'webp', format: 'webp' }
  if (format === 'webp') return { mime: 'image/jpeg', ext: 'jpg', format: 'jpeg' }
  if (supportsWebP()) return { mime: 'image/webp', ext: 'webp', format: 'webp' }
  return { mime: 'image/jpeg', ext: 'jpg', format: 'jpeg' }
}

function processedFromBlob(blob: Blob, baseName: string, fallback: { mime: string; ext: string }): ProcessedImage {
  const raw = (blob.type || fallback.mime).toLowerCase()
  const mime = raw === 'image/jpg' ? 'image/jpeg' : raw
  const ext =
    mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : fallback.ext
  return { blob, filename: `${baseName}.${ext}` }
}

export function isLikelyImageFile(file: File): boolean {
  if (!file.type || file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)
}

/** Object URL for crop UI; downscales huge photos to avoid OOM on mobile. */
export async function createCropImageSource(
  file: File,
  maxDimension = CROP_PREVIEW_MAX_DIMENSION,
): Promise<CropImageSource> {
  const objectUrl = URL.createObjectURL(file)
  let image: HTMLImageElement | null = null
  try {
    image = await loadImage(objectUrl)
    const longest = Math.max(image.naturalWidth, image.naturalHeight)
    if (longest <= maxDimension) {
      return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) }
    }

    const ratio = maxDimension / longest
    const w = Math.max(1, Math.round(image.naturalWidth * ratio))
    const h = Math.max(1, Math.round(image.naturalHeight * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas недоступний')
    ctx.drawImage(image, 0, 0, w, h)
    image.src = ''
    image = null
    URL.revokeObjectURL(objectUrl)

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    if (!blob) throw new Error('Не вдалося підготувати зображення')
    const url = URL.createObjectURL(blob)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  } catch (err) {
    URL.revokeObjectURL(objectUrl)
    throw err
  }
}

async function encodeCanvas(canvas: HTMLCanvasElement, opts: ProcessImageOptions): Promise<ProcessedImage> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
  const picked = pickMime(opts.format)
  let quality = 0.9
  let scale = 1
  const baseName = opts.filename ?? 'photo'
  const out = document.createElement('canvas')
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступний')

  for (let attempt = 0; attempt < 16; attempt++) {
    const w = Math.max(1, Math.round(canvas.width * scale))
    const h = Math.max(1, Math.round(canvas.height * scale))
    out.width = w
    out.height = h
    ctx.drawImage(canvas, 0, 0, w, h)

    const blob = await canvasToBlob(out, picked.mime, quality)
    if (!blob) throw new Error('Не вдалося закодувати зображення')

    if (blob.size <= maxBytes || (quality <= 0.55 && scale <= 0.6)) {
      return processedFromBlob(blob, baseName, picked)
    }

    if (quality > 0.58) {
      quality -= 0.07
    } else {
      scale *= 0.88
      quality = 0.82
    }
  }

  out.width = canvas.width
  out.height = canvas.height
  ctx.drawImage(canvas, 0, 0)
  const blob = await canvasToBlob(out, picked.mime, 0.55)
  if (!blob) throw new Error('Не вдалося стиснути зображення')
  return processedFromBlob(blob, baseName, picked)
}

export async function processCroppedImage(
  imageSrc: string,
  crop: Area,
  opts: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  const image = await loadImage(imageSrc)
  const maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION

  let { width, height } = crop
  const longest = Math.max(width, height)
  if (longest > maxDimension) {
    const ratio = maxDimension / longest
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступний')

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  )
  image.src = ''

  return encodeCanvas(canvas, opts)
}

export async function processImageFile(file: File, opts: ProcessImageOptions = {}): Promise<ProcessedImage> {
  const src = URL.createObjectURL(file)
  try {
    const image = await loadImage(src)
    const maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION
    let { width, height } = image
    const longest = Math.max(width, height)
    if (longest > maxDimension) {
      const ratio = maxDimension / longest
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas недоступний')
    ctx.drawImage(image, 0, 0, width, height)
    image.src = ''
    const base = (opts.filename ?? (file.name.replace(/\.[^.]+$/, '') || 'photo')).slice(0, 40)
    return encodeCanvas(canvas, { ...opts, filename: base })
  } finally {
    URL.revokeObjectURL(src)
  }
}

/** @deprecated Use createCropImageSource — data URLs blow up memory on phone photos. */
export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'))
    reader.readAsDataURL(file)
  })
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
