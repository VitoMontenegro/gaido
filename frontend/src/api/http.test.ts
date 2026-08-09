import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatApiError, ApiClientError, bootstrapAuth, setAccessToken, getAccessToken } from './http'
import { queryKeys } from './queryKeys'

describe('formatApiError', () => {
  it('maps known codes', () => {
    const msg = formatApiError(new ApiClientError('FORBIDDEN', 'x'))
    expect(msg).toContain('прав')
  })

  it('maps RATE_LIMITED', () => {
    const msg = formatApiError(new ApiClientError('RATE_LIMITED', 'x'))
    expect(msg).toContain('спроб')
  })
})

describe('queryKeys', () => {
  it('builds stable guide key', () => {
    expect(queryKeys.guide('ivan')).toEqual(['guide', 'ivan'])
  })
})

describe('auth token storage', () => {
  afterEach(() => {
    setAccessToken(null)
    vi.unstubAllGlobals()
  })

  it('keeps access token in memory only', () => {
    setAccessToken('test-token')
    expect(getAccessToken()).toBe('test-token')
    setAccessToken(null)
    expect(getAccessToken()).toBeNull()
  })

  it('bootstrapAuth restores session from refresh cookie', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'refreshed' }),
    })) as unknown as typeof fetch)

    const ok = await bootstrapAuth()
    expect(ok).toBe(true)
    expect(getAccessToken()).toBe('refreshed')
  })
})
