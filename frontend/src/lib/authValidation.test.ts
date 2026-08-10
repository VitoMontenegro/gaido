import { describe, expect, it } from 'vitest'
import { validateRegisterForm } from './authValidation'

const base = {
  email: 'user@example.com',
  login: 'ivan_petrov',
  password: 'secret123',
  password_confirm: 'secret123',
  first_name: 'Іван',
  last_name: 'Петренко',
  accept_privacy: true,
  accept_site_rules: true,
  accept_placement_rules: true,
}

describe('validateRegisterForm', () => {
  it('accepts valid tourist data', () => {
    expect(validateRegisterForm(base, 'tourist')).toBeNull()
  })

  it('accepts valid guide data', () => {
    expect(validateRegisterForm({ ...base, accept_site_rules: false }, 'guide')).toBeNull()
  })

  it('rejects cyrillic login', () => {
    expect(validateRegisterForm({ ...base, login: 'іван' }, 'tourist')).toMatch(/латиниця/)
  })

  it('requires site rules for tourist', () => {
    expect(validateRegisterForm({ ...base, accept_site_rules: false }, 'tourist')).toMatch(/правилами сайту/)
  })

  it('rejects mismatched passwords', () => {
    expect(
      validateRegisterForm({ ...base, password_confirm: 'other123' }, 'tourist'),
    ).toMatch(/співпадають/)
  })
})
