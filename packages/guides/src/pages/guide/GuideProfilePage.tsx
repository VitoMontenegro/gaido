import { useSaveNotification } from '@gaido/ui-primitives/SaveNotification'
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
import GuideProfileTabs from '../../components/crm/GuideProfileTabs'
import AiImproveButton from '../../components/AiImproveButton'

export function GuideProfilePage() {
  return (
    <>
      <GuideProfileTabs />
      <GuideProfileForm />
    </>
  )
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
  const notify = useSaveNotification()
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
  const [geoPending, setGeoPending] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const patch = (next: Partial<GuideProfile>) => {
    setProfileSaved(false)
    setForm((prev) => ({ ...prev, ...next }))
  }
  const profileExists = Boolean(data?.id)

  useEffect(() => {
    if (!avatarSaved) return
    const timer = window.setTimeout(() => setAvatarSaved(false), 4000)
    return () => window.clearTimeout(timer)
  }, [avatarSaved])

  const mutation = useMutation({
    mutationFn: async (body: Partial<GuideProfile>) => {
      await guideApi.updateProfile(guideProfilePayload(body))
      if (profileExists) return
      const countries = geoCountries ?? resolveCountries(data)
      const cities = geoCities ?? body.cities ?? data?.cities ?? []
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
      setProfileSaved(true)
      notify('Профіль гіда оновлено.')
      if (afterSavePath) navigate(afterSavePath)
    },
    onError: (error) => notify(formatApiError(error), 'error'),
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

  const geoSave = useMutation({
    mutationFn: async ({ countries, cities }: { countries: GuideCountry[]; cities: GuideCity[] }) => {
      await guideApi.setCountries({
        country_ids: countries.map((country) => country.id),
        primary_country_id: countries.find((country) => country.is_primary)?.id ?? countries[0]?.id,
      })
      await guideApi.setCities({
        city_ids: cities.map((city) => city.id),
        primary_city_id: cities.find((city) => city.is_primary)?.id ?? cities[0]?.id,
      })
    },
    onSuccess: (_result, saved) => {
      qc.setQueryData(['guide-profile'], (previous: GuideProfile | undefined) => previous && ({
        ...previous,
        countries: saved.countries,
        cities: saved.cities,
        country_id: saved.countries.find((country) => country.is_primary)?.id ?? saved.countries[0]?.id ?? null,
      }))
      setGeoCountries(null)
      setGeoCities(null)
      void qc.invalidateQueries({ queryKey: ['guide-profile'] })
      void qc.invalidateQueries({ queryKey: ['countries-with-guides'] })
    },
  })

  const f = { ...data, ...form }
  const countries = geoCountries ?? resolveCountries(data)
  const cities = geoCities ?? f.cities ?? []
  const aboutValue = f.about ?? ''
  const aboutLen = guideAboutLen(aboutValue)
  const profileChanged = (!profileExists && Boolean((f.display_name ?? '').trim())) || JSON.stringify(guideProfilePayload(f)) !== JSON.stringify(guideProfilePayload(data ?? {}))
  const geoKey = (items: (GuideCity | GuideCountry)[]) =>
    JSON.stringify(items.map(({ id, is_primary }) => ({ id, is_primary })).sort((a, b) => a.id - b.id))
  const geoChanged = geoKey(countries) !== geoKey(resolveCountries(data)) || geoKey(cities) !== geoKey(data?.cities ?? [])
  const countriesWithoutCities = countries.filter((country) => !cities.some((city) => city.country_slug === country.slug))
  const saveDisabled = !data || mutation.isPending || avatarMutation.isPending || geoSave.isPending || geoPending || !(f.display_name ?? '').trim() || (!profileChanged && (!geoChanged || profileExists)) || countriesWithoutCities.length > 0 || (profileExists && geoChanged)

  useEffect(() => {
    if (!profileExists || !geoChanged || countriesWithoutCities.length || geoPending || mutation.isPending || geoSave.isPending || geoSave.isError) return
    const timer = window.setTimeout(() => geoSave.mutate({ countries, cities }), 400)
    return () => window.clearTimeout(timer)
  }, [profileExists, geoChanged, geoKey(countries), geoKey(cities), countriesWithoutCities.length, geoPending, mutation.isPending, geoSave.isPending, geoSave.isError])
  const saveProfile = () => {
    if (!saveDisabled) {
      setProfileSaved(false)
      mutation.mutate({ ...f, cities, countries })
    }
  }


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
            simpleUpload
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
      <p className="text-sm text-stone-500">
        Адреса профілю: {f.website_slug ? `/guide/${f.website_slug}` : 'зʼявиться після збереження. Змінити може лише адміністратор.'}
      </p>
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
      <AiImproveButton
        kind="about"
        value={aboutValue}
        onApply={(about) => patch({ about })}
        context={{
          name: (f.display_name ?? '').trim() || undefined,
          city: (cities.find((city) => city.is_primary) ?? cities[0])?.name,
        }}
        disabled={mutation.isPending}
      />
      <GuideGeoSection
        countries={countries}
        cities={cities}
        onCountriesChange={setGeoCountries}
        onCitiesChange={setGeoCities}
        onPendingChange={setGeoPending}
        disabled={mutation.isPending || geoSave.isPending}
        saveStatus={
          countriesWithoutCities.length > 0 ? (
            <p className="text-sm text-amber-800">Оберіть місто для кожної країни. Після цього зміни збережуться автоматично.</p>
          ) : !profileExists && geoChanged ? (
            <p className="text-sm text-stone-600">Географія збережеться разом із новим профілем. Заповніть контакти нижче та натисніть «Зберегти профіль».</p>
          ) : geoSave.isError && geoChanged ? (
            <div role="alert" className="space-y-2 text-sm text-red-700">
              <p>Не вдалося зберегти географію. {formatApiError(geoSave.error)}</p>
              <button type="button" className="btn-secondary" onClick={() => geoSave.mutate({ countries, cities })}>Спробувати ще раз</button>
            </div>
          ) : geoPending || geoSave.isPending || (profileExists && geoChanged) ? (
            <p role="status" className="text-sm text-stone-600">Збереження міст і країн…</p>
          ) : geoSave.isSuccess ? (
            <p role="status" className="text-sm text-emerald-700">Країни та міста збережено автоматично.</p>
          ) : (
            <p className="text-sm text-stone-500">Країни та міста зберігаються автоматично.</p>
          )
        }
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
      <div className="space-y-2 border-t border-border pt-4">
        <button
          type="button"
          className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 sm:w-auto"
          disabled={saveDisabled}
          onClick={saveProfile}
        >
          {mutation.isPending ? 'Зберігаємо…' : 'Зберегти профіль'}
        </button>
        <div aria-live="polite" aria-atomic="true">
          {mutation.isPending ? (
            <p className="text-sm text-stone-600">Зберігаємо зміни профілю…</p>
          ) : mutation.isError && !profileSaved ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Не вдалося зберегти профіль. {formatApiError(mutation.error)}</p>
          ) : profileSaved && !profileChanged ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">✓ Профіль успішно збережено.</p>
          ) : countriesWithoutCities.length > 0 ? (
            <p className="text-sm text-amber-800">Оберіть місто для кожної країни в розділі «Географія роботи».</p>
          ) : !(f.display_name ?? '').trim() ? (
            <p className="text-sm text-stone-600">Вкажіть ім’я для відображення, щоб зберегти профіль.</p>
          ) : geoPending || geoSave.isPending || (profileExists && geoChanged && !geoSave.isError) ? (
            <p className="text-sm text-stone-600">Зачекайте, поки збережуться країни та міста.</p>
          ) : geoSave.isError && geoChanged ? (
            <p className="text-sm text-red-700">Спочатку повторіть збереження міст і країн у розділі «Географія роботи».</p>
          ) : !profileChanged && !geoChanged ? (
            <p className="text-sm text-stone-500">Усі зміни збережено. Кнопка стане активною після редагування профілю.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
