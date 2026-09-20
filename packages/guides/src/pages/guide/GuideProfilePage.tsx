import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '@gaido/api-client/api/client'
import { formatApiError } from '@gaido/api-client/api/http'
import { useHasRole } from '@gaido/api-client/hooks/useAuth'
import GuideAvatar from '../../components/GuideAvatar'
import GuideGeoSection from '../../components/guide/GuideGeoSection'
import { ImageUrlField } from '../../components/ImageUrlField'
import type { GuideCity, GuideCountry, GuideProfile } from './shared'
import { CatalogStatusBanner, guideProfilePayload } from './shared'
import { GUIDE_ABOUT_MAX_LEN, guideAboutLen, nextGuideAbout } from '../../lib/guideAbout'

export function GuideProfilePage() {
  return <GuideProfileForm />
}

function resolveCountries(data?: GuideProfile): GuideCountry[] {
  if (data?.countries?.length) return data.countries
  if (data?.country_id && data.country_slug && data.country_name) {
    return [{
      id: data.country_id,
      slug: data.country_slug,
      name: data.country_name,
      is_primary: true,
    }]
  }
  return []
}

function GuideProfileForm() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const isGuide = useHasRole('ROLE_GUIDE')
  const nextPath =
    location.state && typeof location.state === 'object' && 'next' in location.state
      ? String((location.state as { next?: string }).next)
      : undefined
  const afterSavePath = nextPath?.startsWith('/account/') ? nextPath : undefined
  const { data } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const [form, setForm] = useState<Partial<GuideProfile>>({})
  const [geoCountries, setGeoCountries] = useState<GuideCountry[] | null>(null)
  const [geoCities, setGeoCities] = useState<GuideCity[] | null>(null)
  const [avatarSaved, setAvatarSaved] = useState(false)
  const patch = (next: Partial<GuideProfile>) => setForm((prev) => ({ ...prev, ...next }))
  const profileExists = Boolean(data?.id)

  useEffect(() => {
    if (!avatarSaved) return
    const timer = window.setTimeout(() => setAvatarSaved(false), 4000)
    return () => window.clearTimeout(timer)
  }, [avatarSaved])

  const mutation = useMutation({
    mutationFn: async (body: Partial<GuideProfile>) => {
      await guideApi.updateProfile(guideProfilePayload(body))
      const countries = geoCountries ?? resolveCountries(data)
      const cities = geoCities ?? body.cities ?? data?.cities ?? []
      if (!countries.length && !cities.length) return
      const primaryCountry = countries.find((c) => c.is_primary)?.id ?? countries[0]?.id
      const primaryCity = cities.find((c) => c.is_primary)?.id ?? cities[0]?.id
      await guideApi.setCountries({
        country_ids: countries.map((c) => c.id),
        primary_country_id: primaryCountry,
      })
      await guideApi.setCities({
        city_ids: cities.map((c) => c.id),
        primary_city_id: primaryCity,
      })
    },
    onSuccess: async () => {
      setForm({})
      setGeoCountries(null)
      setGeoCities(null)
      await qc.invalidateQueries({ queryKey: ['guide-profile'] })
      await qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['countries-with-guides'] })
      if (afterSavePath) navigate(afterSavePath)
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (avatar_url: string) =>
      guideApi.updateProfile(guideProfilePayload({ ...data, avatar_url })),
    onSuccess: async (_res, avatar_url) => {
      qc.setQueryData(['guide-profile'], (prev: GuideProfile | undefined) =>
        prev ? { ...prev, avatar_url } : prev,
      )
      setForm((prev) => {
        if (!('avatar_url' in prev)) return prev
        const next = { ...prev }
        delete next.avatar_url
        return next
      })
      setAvatarSaved(true)
      await qc.invalidateQueries({ queryKey: ['guide-profile'] })
      await qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const f = { ...data, ...form }
  const countries = geoCountries ?? resolveCountries(data)
  const cities = geoCities ?? f.cities ?? []
  const aboutValue = f.about ?? ''
  const aboutLen = guideAboutLen(aboutValue)

  return (
    <div className="card space-y-3">
      <h2 className="font-display text-xl font-bold">Профіль</h2>
      {!isGuide && (
        <p className="text-sm text-stone-600">
          Ім&apos;я можна взяти з профілю перевізника або автора оголошень. Після збереження на цей акаунт додається роль гіда.
        </p>
      )}
      {f.status ? <p className="text-base text-stone-500">Статус профілю: {f.status}</p> : null}
      {profileExists ? <CatalogStatusBanner profile={f} /> : null}
      <div className="flex flex-wrap items-start gap-4">
        <GuideAvatar avatar={f.avatar_url} name={f.display_name} className="h-24 w-24 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <ImageUrlField
            label="Фото профілю"
            value={f.avatar_url ?? ''}
            cropAspect={1}
            outputFormat="webp"
            maxBytes={150 * 1024}
            onChange={(avatar_url) => patch({ avatar_url })}
            onPersist={(avatar_url) => {
              patch({ avatar_url })
              setAvatarSaved(false)
              if (profileExists || (f.display_name ?? '').trim()) avatarMutation.mutate(avatar_url)
            }}
          />
          {avatarMutation.isPending && (
            <p className="mt-1 text-sm text-stone-500">Збереження фото…</p>
          )}
          {avatarSaved && !avatarMutation.isPending && (
            <p className="mt-1 text-sm text-emerald-700">Фото збережено</p>
          )}
          {avatarMutation.isError && (
            <p className="mt-1 text-sm text-red-600">Не вдалося зберегти фото. Спробуйте ще раз.</p>
          )}
        </div>
      </div>
      <input
        className="input"
        placeholder="Ім&apos;я для відображення"
        value={f.display_name ?? ''}
        onChange={(e) => patch({ display_name: e.target.value })}
      />
      <label className="block space-y-1 text-sm">
        <span className="text-stone-500">Адреса профілю</span>
        <input
          className="input"
          placeholder="vito"
          value={f.website_slug ?? ''}
          onChange={(e) => patch({ website_slug: e.target.value })}
        />
        <span className="text-stone-500">
          {f.website_slug ? `/guide/${f.website_slug}` : 'Якщо порожньо — з імені. Якщо зайнято в гідах, збереження не пройде.'}
        </span>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-stone-500">Про себе</span>
        <textarea
          className="input min-h-24"
          placeholder="Про себе"
          maxLength={aboutLen > GUIDE_ABOUT_MAX_LEN ? undefined : GUIDE_ABOUT_MAX_LEN}
          value={aboutValue}
          onChange={(e) => patch({ about: nextGuideAbout(aboutValue, e.target.value) })}
        />
        <span className={aboutLen > GUIDE_ABOUT_MAX_LEN ? 'text-red-600' : 'text-stone-500'}>
          {aboutLen}/{GUIDE_ABOUT_MAX_LEN}. Посилання на публічних сторінках не показуються.
        </span>
      </label>
      <GuideGeoSection
        countries={countries}
        cities={cities}
        onCountriesChange={setGeoCountries}
        onCitiesChange={setGeoCities}
      />
      <div className="space-y-3 rounded-xl border border-border bg-sand-50/80 p-4">
        <p className="font-medium">Контакти для клієнтів</p>
        <p className="text-base text-stone-500">
          Відображаються на сторінці екскурсії та в профілі гіда після активації розміщення.
        </p>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={f.email ?? ''}
          onChange={(e) => patch({ email: e.target.value })}
        />
        <input
          className="input"
          placeholder="Telegram (@username)"
          value={f.telegram ?? ''}
          onChange={(e) => patch({ telegram: e.target.value })}
        />
        <input
          className="input"
          placeholder="WhatsApp (+380…)"
          value={f.whatsapp ?? ''}
          onChange={(e) => patch({ whatsapp: e.target.value })}
        />
        <input
          className="input"
          placeholder="Viber (+380…)"
          value={f.viber ?? ''}
          onChange={(e) => patch({ viber: e.target.value })}
        />
        <input
          className="input"
          placeholder="Телефон"
          value={f.phone ?? ''}
          onChange={(e) => patch({ phone: e.target.value })}
        />
        <input
          className="input"
          placeholder="Час для відповідей (наприклад: відповідаю на запити з 9 до 19 год)"
          value={f.response_hours ?? ''}
          onChange={(e) => patch({ response_hours: e.target.value })}
        />
      </div>
      {mutation.isError && (
        <p className="text-base text-red-600">{formatApiError(mutation.error)}</p>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={mutation.isPending || !(f.display_name ?? '').trim()}
        onClick={() => mutation.mutate({ ...f, cities, countries })}
      >
        {mutation.isPending ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  )
}
