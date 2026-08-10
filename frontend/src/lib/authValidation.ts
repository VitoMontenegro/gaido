const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const loginRe = /^[a-zA-Z0-9_.-]{3,32}$/

export type RegisterFormData = {
  email: string
  login: string
  password: string
  first_name: string
  last_name: string
  accept_privacy: boolean
  accept_site_rules: boolean
  accept_placement_rules: boolean
}

export function validateRegisterForm(
  form: RegisterFormData,
  mode: 'tourist' | 'guide',
): string | null {
  const email = form.email.trim()
  const login = form.login.trim()
  const firstName = form.first_name.trim()
  const lastName = form.last_name.trim()

  if (!firstName) return 'Вкажіть імʼя'
  if (!lastName) return 'Вкажіть прізвище'
  if (!email) return 'Вкажіть email'
  if (!emailRe.test(email)) return 'Невірний формат email'
  if (!login) return 'Вкажіть логін'
  if (!loginRe.test(login)) {
    return 'Логін: лише латиниця, цифри та символи _ . - (від 3 до 32 символів)'
  }
  if (form.password.length < 8) return 'Пароль — мінімум 8 символів'
  if (!form.accept_privacy) return 'Потрібна згода з політикою конфіденційності'
  if (mode === 'tourist' && !form.accept_site_rules) return 'Потрібна згода з правилами сайту'
  if (mode === 'guide' && !form.accept_placement_rules) return 'Потрібна згода з правилами розміщення'
  return null
}
