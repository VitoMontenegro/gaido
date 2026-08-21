import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, guideApi } from '@gaido/api-client/api/client'
import GuideAvatar from '../../components/GuideAvatar'
import GuideGeoSection from '../../components/guide/GuideGeoSection'
import { ImageUrlField } from '../../components/ImageUrlField'
import type { GuideCity, GuideProfile } from './shared'
import { CatalogStatusBanner } from './shared'

export function GuideProfilePage() {
  return <GuideProfileForm />
}

function profilePayload(f: Partial<GuideProfile>) {
  return {
    guide_type: f.guide_type,
    display_name: f.display_name ?? '',
    about: f.about ?? '',
    avatar_url: f.avatar_url ?? '',
    phone: f.phone ?? '',
    email: f.email ?? '',
    telegram: f.telegram ?? '',
    whatsapp: f.whatsapp ?? '',
    viber: f.viber ?? '',
    response_hours: f.response_hours ?? '',
    country_id: f.country_id ?? null,
  }
}

function GuideProfileForm() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['guide-profile'],
    queryFn: () => api<GuideProfile>('/api/v1/account/guide/profile'),
  })
  const [form, setForm] = useState<Partial<GuideProfile>>({})
  const [geoCities, setGeoCities] = useState<GuideCity[] | null>(null)
  const patch = (next: Partial<GuideProfile>) => setForm((prev) => ({ ...prev, ...next }))

  const mutation = useMutation({
    mutationFn: async (body: Partial<GuideProfile>) => {
      await guideApi.updateProfile(profilePayload(body))
      const allCities = geoCities ?? body.cities ?? data?.cities ?? []
      const countrySlug = body.country_slug ?? data?.country_slug
      const cities = countrySlug
        ? allCities.filter((c) => c.country_slug === countrySlug)
        : allCities
      const primary = cities.find((c) => c.is_primary)?.id ?? cities[0]?.id
      await guideApi.setCities({
        city_ids: cities.map((c) => c.id),
        primary_city_id: primary,
      })
    },
    onSuccess: () => {
      setForm({})
      setGeoCities(null)
      qc.invalidateQueries({ queryKey: ['guide-profile'] })
      qc.invalidateQueries({ queryKey: ['countries-with-guides'] })
    },
  })

  const f = { ...data, ...form }
  const cities = geoCities ?? f.cities ?? []
  const isCompanion = f.guide_type === 'COMPANION'

  return (
    <div className="card space-y-3">
      <h2 className="font-display text-xl font-bold">Профіль</h2>
      <p className="text-base text-stone-500">Статус профілю: {f.status}</p>
      <CatalogStatusBanner profile={f} />
      <label className="flex items-center gap-2 text-base">
        <input
          type="checkbox"
          checked={isCompanion}
          onChange={(e) => patch({ guide_type: e.target.checked ? 'COMPANION' : 'GUIDE' })}
        />
        Я компаньйон (ліцензія не потрібна)
      </label>
      {!isCompanion && (
        <p className="text-base text-stone-500">
          Тип «Гід» або «Конферансьє» визначається завантаженою ліцензією в розділі{' '}
          <Link to="/account/guide/documents" className="text-brand-700 hover:underline">Документи</Link>.
        </p>
      )}
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
          />
        </div>
      </div>
      <input
        className="input"
        placeholder="Ім&apos;я для відображення"
        value={f.display_name ?? ''}
        onChange={(e) => patch({ display_name: e.target.value })}
      />
      <textarea
        className="input min-h-24"
        placeholder="Про себе"
        value={f.about ?? ''}
        onChange={(e) => patch({ about: e.target.value })}
      />
      <GuideGeoSection
        countryId={f.country_id}
        countrySlug={f.country_slug}
        cities={cities}
        onCountryChange={(countryId, countrySlug) => {
          patch({ country_id: countryId, country_slug: countrySlug })
          const current = geoCities ?? f.cities ?? []
          setGeoCities(
            countrySlug ? current.filter((c) => c.country_slug === countrySlug) : [],
          )
        }}
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
        <p className="text-base text-red-600">Не вдалося зберегти профіль. Спробуйте ще раз.</p>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={mutation.isPending || !data}
        onClick={() => mutation.mutate({ ...f, cities })}
      >
        {mutation.isPending ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  )
}
