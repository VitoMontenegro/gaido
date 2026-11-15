const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RegisterFormData = {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  accept_privacy: boolean
  accept_site_rules: boolean
}

export function validateRegisterForm(form: RegisterFormData): string | null {
  const email = form.email.trim()
  const firstName = form.first_name.trim()
  const lastName = form.last_name.trim()

  if (!firstName) return 'Вкажіть імʼя'
  if (!lastName) return 'Вкажіть прізвище'
  if (!email) return 'Вкажіть email'
  if (!emailRe.test(email)) return 'Невірний формат email'
  if (form.password.length < 8) return 'Пароль — мінімум 8 символів'
  if (!form.password_confirm) return 'Повторіть пароль'
  if (form.password !== form.password_confirm) return 'Паролі не співпадають'
  if (!form.accept_privacy) return 'Потрібна згода з політикою конфіденційності'
  if (!form.accept_site_rules) return 'Потрібна згода з правилами сайту'
  return null
}

export function validateOAuthConsents(privacy: boolean, siteRules: boolean): string | null {
  if (!privacy) return 'Потрібна згода з політикою конфіденційності'
  if (!siteRules) return 'Потрібна згода з правилами сайту'
  return null
}
