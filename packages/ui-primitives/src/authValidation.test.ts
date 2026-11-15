import { describe, expect, it } from 'vitest'
import { validateRegisterForm } from './authValidation'

const base = {
  email: 'user@example.com',
  password: 'secret123',
  password_confirm: 'secret123',
  first_name: 'Іван',
  last_name: 'Петренко',
  accept_privacy: true,
  accept_site_rules: true,
}

describe('validateRegisterForm', () => {
  it('accepts valid tourist data', () => {
    expect(validateRegisterForm(base)).toBeNull()
  })

  it('requires site rules', () => {
    expect(validateRegisterForm({ ...base, accept_site_rules: false })).toMatch(/правилами сайту/)
  })

  it('rejects mismatched passwords', () => {
    expect(validateRegisterForm({ ...base, password_confirm: 'other123' })).toMatch(/співпадають/)
  })
})
