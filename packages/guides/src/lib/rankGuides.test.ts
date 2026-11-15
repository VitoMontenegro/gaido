import { describe, expect, it } from 'vitest'
import type { PublicGuide } from '@gaido/api-client/api/client'
import { guideCardLinked, rankGuidesByExcursions } from './rankGuides'

function guide(id: number, name: string, excursionCount?: number): PublicGuide {
  return {
    id,
    slug: name,
    display_name: name,
    guide_type: 'GUIDE',
    about: '',
    rating_avg: 0,
    rating_count: 0,
    status: 'ACTIVE',
    contacts: { visible: false },
    excursion_count: excursionCount,
  }
}

describe('rankGuidesByExcursions', () => {
  it('orders by published excursion count and keeps ties stable', () => {
    const ranked = rankGuidesByExcursions([
      guide(1, 'Анна', 0),
      guide(2, 'Богдан', 3),
      guide(3, 'Віра', 3),
      guide(4, 'Ганна', 1),
    ])
    expect(ranked.map((item) => item.id)).toEqual([2, 3, 4, 1])
  })
})

describe('guideCardLinked', () => {
  it('drops the link only when the catalog counted zero excursions', () => {
    expect(guideCardLinked(guide(1, 'Анна', 0))).toBe(false)
    expect(guideCardLinked(guide(2, 'Богдан', 2))).toBe(true)
    expect(guideCardLinked(guide(3, 'Віра'))).toBe(true)
    expect(guideCardLinked(guide(1, 'Анна', 0), true)).toBe(true)
  })
})
