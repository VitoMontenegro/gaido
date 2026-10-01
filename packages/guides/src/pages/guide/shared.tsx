export type GuideProfile = {
  id: number
  guide_type: string
  display_name: string
  website_slug?: string
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

export function guideProfilePayload(f: Partial<GuideProfile>, guideType?: string) {
  return {
    guide_type: guideType ?? f.guide_type,
    display_name: f.display_name ?? '',
    website_slug: f.website_slug ?? '',
    about: f.about ?? '',
    avatar_url: f.avatar_url ?? '',
    phone: f.phone ?? '',
    email: f.email ?? '',
    telegram: f.telegram ?? '',
    whatsapp: f.whatsapp ?? '',
    viber: f.viber ?? '',
    response_hours: f.response_hours ?? '',
  }
}

export function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function catalogStatusText(status: string) {
  if (status === 'companion') return 'компаньйон(турлідер)'
  if (status === 'confirmed') return 'Підтверджено'
  if (status === 'pending') return 'компаньйон(турлідер)'
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
  if (profile.catalog_status === 'companion' || profile.catalog_status === 'pending' || !profile.type_badge) {
    return 'компаньйон(турлідер)'
  }
  return profile.type_badge
}

export function CatalogStatusBanner({ profile }: { profile: Partial<GuideProfile> }) {
  const label = catalogStatusLabel(profile)
  const tone = 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-medium">Статус у каталозі: {label}</p>
      {profile.catalog_status !== 'confirmed' && (
        <p className="mt-1 opacity-90">
          Документів немає — за замовчуванням «компаньйон(турлідер)». Завантажте ліцензію, щоб стати гідом або конферансьє.
        </p>
      )}
    </div>
  )
}
