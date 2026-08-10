import { lazy, type ComponentType } from 'react'

const CHUNK_RE = /Failed to fetch dynamically imported module|Loading chunk \d+ failed/i

function isChunkLoadError(err: unknown): boolean {
  if (err instanceof Error) return CHUNK_RE.test(err.message)
  return typeof err === 'string' && CHUNK_RE.test(err)
}

/** lazy() with one retry for transient chunk load failures (deploy/restart). */
export function lazyImport<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (!isChunkLoadError(err)) throw err
      return factory()
    }
  })
}

export function isDynamicImportError(error: Error): boolean {
  return isChunkLoadError(error)
}

export const CHUNK_RELOAD_KEY = 'chunk-reload-once'
