export type GuideProfile = {
  id: number
  guide_type: string
  display_name: string
  about: string
  avatar_url?: string
  phone: string
  email: string
  telegram: string
  whatsapp: string
  viber: string
  response_hours: string
  status: string
  type_badge?: string
  has_license: boolean
  catalog_status: 'companion' | 'confirmed' | 'pending'
  country_id?: number | null
  country_slug?: string
  country_name?: string
  countries?: GuideCountry[]
  cities?: GuideCity[]
}

export type GuideCountry = {
  id: number
  slug: string
  name: string
  is_primary: boolean
}

export type GuideCity = {
  id: number
  name: string
  slug: string
  country_slug: string
  is_primary: boolean
}

export type GuideDocument = {
  id: number
  type: string
  mime_type: string
  size: number
}

export function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function catalogStatusText(status: string) {
  if (status === 'companion') return 'Компаньйон'
  if (status === 'confirmed') return 'Підтверджено'
  if (status === 'pending') return 'Без бейджа'
  return status
}

export function formatPaidUntil(iso?: string, paymentsEnabled = true) {
  if (!paymentsEnabled) return '—'
  if (!iso) return 'Не оплачено'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function planPeriodLabel(days: number) {
  if (days <= 7) return 'Тиждень'
  if (days <= 31) return 'Місяць'
  return 'Рік'
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function catalogStatusLabel(profile: Partial<GuideProfile>) {
  if (profile.catalog_status === 'companion') return 'Компаньйон'
  if (profile.type_badge) return profile.type_badge
  if (profile.catalog_status === 'pending') return 'Без бейджа'
  return 'Не визначено'
}

export function CatalogStatusBanner({ profile }: { profile: Partial<GuideProfile> }) {
  const label = catalogStatusLabel(profile)
  const tone =
    profile.catalog_status === 'confirmed' || profile.catalog_status === 'companion'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-900'

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-medium">Статус у каталозі: {label}</p>
      {profile.catalog_status === 'pending' && (
        <p className="mt-1 opacity-90">Завантажте ліцензію гіда або конферансьє — бейдж з&apos;явиться після завантаження.</p>
      )}
    </div>
  )
}
