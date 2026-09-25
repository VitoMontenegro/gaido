import { describe, expect, it } from 'vitest'
import { ukInLocative } from './ukLocative'

describe('ukInLocative', () => {
  it('declines any place name, not a fixed city list', () => {
    expect(ukInLocative('Прага')).toBe('у Празі')
    expect(ukInLocative('Рим')).toBe('у Римі')
    expect(ukInLocative('Париж')).toBe('у Парижі')
    expect(ukInLocative('Барселона')).toBe('у Барселоні')
    expect(ukInLocative('Відень')).toBe('у Відні')
    expect(ukInLocative('Київ')).toBe('у Києві')
    expect(ukInLocative('Львів')).toBe('у Львові')
    expect(ukInLocative('Нью-Йорк')).toBe('у Нью-Йорку')
    expect(ukInLocative('Італія')).toBe('в Італії')
    expect(ukInLocative('Франція')).toBe('у Франції')
    expect(ukInLocative('Польща')).toBe('у Польщі')
    expect(ukInLocative('Німеччина')).toBe('у Німеччині')
    expect(ukInLocative('Чехія')).toBe('у Чехії')
    expect(ukInLocative('Велика Британія')).toBe('у Великій Британії')
    expect(ukInLocative('Осло')).toBe('в Осло')
  })
})
