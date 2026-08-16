import { lazy, type ComponentType } from 'react'

const CHUNK_RE = /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed|Unable to preload CSS/i

function isChunkLoadError(err: unknown): boolean {
  if (err instanceof Error) return CHUNK_RE.test(err.message)
  return typeof err === 'string' && CHUNK_RE.test(err)
}

export const CHUNK_RELOAD_KEY = 'chunk-reload-once'

/** One automatic full reload per tab session after deploy/chunk mismatch. */
export function reloadAppOnChunkError(): boolean {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  window.location.reload()
  return true
}

export function clearChunkReloadFlag() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
}

/** lazy() with reload on stale chunk after deploy. */
export function lazyImport<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (!isChunkLoadError(err)) throw err
      reloadAppOnChunkError()
      throw err
    }
  })
}

export function isDynamicImportError(error: Error): boolean {
  return isChunkLoadError(error)
}

export function handleDynamicImportRejection(reason: unknown) {
  if (!isChunkLoadError(reason)) return false
  return reloadAppOnChunkError()
}
