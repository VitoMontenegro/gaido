import { describe, expect, it } from 'vitest'
import { posterTime } from './videoPoster'

describe('posterTime', () => {
  it('uses the eighth second on longer clips', () => {
    expect(posterTime(45)).toBe(8)
  })
  it('falls back to the middle of a short clip', () => {
    expect(posterTime(6)).toBe(3)
  })
})
