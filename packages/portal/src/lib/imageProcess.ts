import type { Area } from 'react-easy-crop'

export type RasterFormat = 'webp' | 'jpeg'

export type ProcessImageOptions = {
  format?: RasterFormat
  maxBytes?: number
  maxDimension?: number
  filename?: string
}

const DEFAULT_MAX_BYTES = 150 * 1024
const DEFAULT_MAX_DIMENSION = 1200

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
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
  if (format === 'webp') return { mime: 'image/webp', ext: 'webp', format: 'webp' }
  if (supportsWebP()) return { mime: 'image/webp', ext: 'webp', format: 'webp' }
  return { mime: 'image/jpeg', ext: 'jpg', format: 'jpeg' }
}

async function encodeCanvas(canvas: HTMLCanvasElement, opts: ProcessImageOptions): Promise<File> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
  const picked = pickMime(opts.format)
  let quality = 0.9
  let scale = 1
  const baseName = opts.filename ?? 'photo'

  for (let attempt = 0; attempt < 16; attempt++) {
    const w = Math.max(1, Math.round(canvas.width * scale))
    const h = Math.max(1, Math.round(canvas.height * scale))
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas недоступний')
    ctx.drawImage(canvas, 0, 0, w, h)

    const blob = await canvasToBlob(out, picked.mime, quality)
    if (!blob) throw new Error('Не вдалося закодувати зображення')

    if (blob.size <= maxBytes || (quality <= 0.55 && scale <= 0.6)) {
      return new File([blob], `${baseName}.${picked.ext}`, { type: picked.mime })
    }

    if (quality > 0.58) {
      quality -= 0.07
    } else {
      scale *= 0.88
      quality = 0.82
    }
  }

  const blob = await canvasToBlob(canvas, picked.mime, 0.55)
  if (!blob) throw new Error('Не вдалося стиснути зображення')
  return new File([blob], `${baseName}.${picked.ext}`, { type: picked.mime })
}

export async function processCroppedImage(
  imageSrc: string,
  crop: Area,
  opts: ProcessImageOptions = {},
): Promise<File> {
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

  return encodeCanvas(canvas, opts)
}

export async function processImageFile(file: File, opts: ProcessImageOptions = {}): Promise<File> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
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
  const base = (opts.filename ?? (file.name.replace(/\.[^.]+$/, '') || 'photo')).slice(0, 40)
  return encodeCanvas(canvas, { ...opts, filename: base })
}

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
