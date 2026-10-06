/** Public env: NEXT_PUBLIC_* (Next) with VITE_* fallback for leftover scripts. */
export function getPublicEnv(viteKey: string): string | undefined {
  const bare = viteKey.startsWith('VITE_') ? viteKey.slice(5) : viteKey
  const nextKey = `NEXT_PUBLIC_${bare}`

  if (typeof process !== 'undefined' && process.env) {
    const fromNext = process.env[nextKey] ?? process.env[viteKey] ?? process.env[bare]
    if (fromNext !== undefined && fromNext !== '') return fromNext
  }

  return undefined
}

export function getBuildIdEnv(): string {
  return getPublicEnv('VITE_BUILD_ID') || getPublicEnv('NEXT_PUBLIC_BUILD_ID') || 'dev'
}
