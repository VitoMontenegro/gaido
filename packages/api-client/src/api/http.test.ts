import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatApiError, ApiClientError, bootstrapAuth, setAccessToken, getAccessToken, api, requireAccessToken } from './http'
import { favoritesApi, reviewsApi } from './reviews'
import { queryKeys } from './queryKeys'

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    json: async () => data,
  }
}

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

  it('bootstrapAuth returns false when refresh has no session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ authenticated: false }),
    })) as unknown as typeof fetch)

    const ok = await bootstrapAuth()
    expect(ok).toBe(false)
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

  it('requireAccessToken throws without a session', () => {
    setAccessToken(null)
    expect(() => requireAccessToken()).toThrow(ApiClientError)
    try {
      requireAccessToken()
    } catch (err) {
      expect(err).toMatchObject({ code: 'UNAUTHORIZED' })
    }
  })
})

describe('guest auth requests', () => {
  afterEach(() => {
    setAccessToken(null)
    vi.unstubAllGlobals()
  })

  it('does not call refresh when a request 401s without an access token', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', request_id: '1' } }, 401),
    )
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(api('/api/v1/account/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/auth/refresh')
  })

  it('retries via refresh when an access token is present', async () => {
    setAccessToken('expired')
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        return jsonResponse({ access_token: 'new-token' })
      }
      if (getAccessToken() === 'new-token') {
        return jsonResponse({ id: 1 })
      }
      return jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'expired', request_id: '1' } }, 401)
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await expect(api('/api/v1/account/me')).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(getAccessToken()).toBe('new-token')
  })

  it('does not fetch favorites or reviews when logged out', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
    setAccessToken(null)

    expect(() => favoritesApi.toggle({ target_type: 'EXCURSION', target_id: 1 })).toThrow(ApiClientError)
    expect(() => favoritesApi.list()).toThrow(ApiClientError)
    expect(() => reviewsApi.create({ excursion_id: 1, rating: 5, text: 'ok' })).toThrow(ApiClientError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves guest favorites without a session', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [] }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
    setAccessToken(null)

    await expect(favoritesApi.resolve([{ target_type: 'EXCURSION', target_id: 1 }])).resolves.toEqual({ items: [] })
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/favorites/resolve')
  })
})
