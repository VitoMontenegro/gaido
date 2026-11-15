import { describe, expect, it } from 'vitest'
import { nextRouteStop, routeStopLength } from './routeStop'

describe('route stop length', () => {
  it('limits new text and counts whole Unicode characters', () => {
    const value = nextRouteStop('', '🏛️'.repeat(40))
    expect(routeStopLength(value)).toBe(60)
  })
  it('preserves existing long text and permits shortening without truncating it', () => {
    const current = 'а'.repeat(80)
    expect(nextRouteStop(current, current + 'б')).toBe(current)
    expect(nextRouteStop(current, current.slice(0, 79))).toHaveLength(79)
  })
})
