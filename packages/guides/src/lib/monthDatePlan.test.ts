import { describe, expect, it } from 'vitest'
import { buildMonthDatePlan } from './monthDatePlan'

describe('month date selection', () => {
  const days = ['2027-01-01', '2027-01-02', '2027-01-03']
  it('adds only missing days and leaves other months unchanged', () => {
    expect(buildMonthDatePlan(days, [{ id: 1, starts_at: '2027-01-02T10:00:00Z' }, { id: 8, starts_at: '2027-02-01T10:00:00Z' }])).toEqual({
      remove: false, addDates: ['2027-01-01', '2027-01-03'], removeIds: [],
    })
  })
  it('removes all entries for selected days when every day is selected', () => {
    const slots = days.map((day, i) => ({ id: i + 1, starts_at: `${day}T10:00:00Z` }))
    slots.push({ id: 4, starts_at: '2027-01-02T14:00:00Z' }, { id: 5, starts_at: '2027-02-01T10:00:00Z' })
    expect(buildMonthDatePlan(days, slots)).toEqual({ remove: true, addDates: [], removeIds: [1, 2, 4, 3] })
  })
})
