import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { authApi, api, type FavoriteItem, userDisplayName } from '../api/client'
import ExcursionCard, { excursionCardPropsFromPartial } from '../components/ExcursionCard'
import GuideAvatar from '../components/GuideAvatar'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { useHasRole, useMe } from '../hooks/useAuth'
import NotificationsPanel from '../components/NotificationsPanel'

export default function AccountPage() {
  const { data: me } = useMe()
  const isGuide = useHasRole('ROLE_GUIDE')
  const isAdmin = useHasRole('ROLE_ADMIN')
  const name = me ? userDisplayName(me) : 'гість'

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api<{ items: FavoriteItem[] }>('/api/v1/favorites'),
    enabled: !isAdmin,
  })

  const favItems = favorites?.items ?? []
  const favCount = favItems.length

  return (
    <>
      <Helmet><title>Особистий кабінет</title></Helmet>
      <div className="space-y-5">
        <div className="card">
          <h1 className="font-display text-2xl font-bold">Привіт, {name}!</h1>
          <p className="mt-2 text-stone-600">
            Тут ваші особисті дані, обране та доступ до робочих розділів.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {isAdmin && (
              <Link to="/admin" className="btn-primary">Аналітика платформи</Link>
            )}
            {isGuide && (
              <Link to="/account/guide" className="btn-primary">Кабінет гіда</Link>
            )}
            <Link to="/account/settings" className="btn-secondary">Налаштування профілю</Link>
            {!isGuide && !isAdmin && (
              <>
                <Link to="/register" className="btn-accent text-sm">
                  Реєстрація
                </Link>
                <Link to="/register/guide" className="btn-ghost text-sm">
                  Стати гідом
                </Link>
              </>
            )}
          </div>
        </div>

        <NotificationsPanel />

        {!isAdmin && (
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Обране</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {favCount > 0 ? `${favCount} збережено` : 'Поки порожньо — додавайте з карток екскурсій і гідів'}
                </p>
              </div>
              <Link to="/account/favorites" className="text-sm text-brand-700 hover:underline">
                Усі →
              </Link>
            </div>
            {favCount > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {favItems.slice(0, 4).map((f) => (
                  <FavoritePreview key={`${f.target_type}-${f.target_id}`} item={f} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}

async function fetchFavorites() {
  return api<{ items: FavoriteItem[] }>('/api/v1/favorites')
}

function FavoritePreview({ item }: { item: FavoriteItem }) {
  if (item.target_type === 'EXCURSION' && item.slug) {
    return (
      <ExcursionCard
        compact
        e={excursionCardPropsFromPartial({
          slug: item.slug,
          title: item.title ?? 'Екскурсія',
          city_name: item.city_name,
          description: item.description,
          price_from: item.price_from,
          currency: item.currency,
          cover_image_url: item.cover_image_url,
          rating_avg: item.rating_avg,
          rating_count: item.rating_count,
        })}
      />
    )
  }
  if (item.target_type === 'GUIDE' && item.slug) {
    return (
      <Link to={`/guide/${item.slug}`} className="flex items-center gap-3 rounded-xl bg-sand-50 p-3 transition hover:bg-sand-100">
        <GuideAvatar avatar={item.avatar_url} name={item.title} className="h-10 w-10 rounded-xl" />
        <div>
          <p className="text-xs text-stone-500">Гід</p>
          <p className="font-medium">{item.title}</p>
        </div>
      </Link>
    )
  }
  return null
}

export function FavoritesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => fetchFavorites(),
  })
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Обране</h1>
        <p className="mt-1 text-sm text-stone-600">Екскурсії та гіди, які ви зберегли для майбутніх подорожей</p>
      </div>

      {isError && <ApiErrorBanner error={error} />}
      {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}

      {!isLoading && items.length === 0 && (
        <div className="card space-y-3 text-center">
          <p className="text-stone-600">Поки нічого не збережено.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/search" className="btn-primary">Переглянути екскурсії</Link>
            <Link to="/guides" className="btn-secondary">Знайти гіда</Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <FavoriteCard key={`${f.target_type}-${f.target_id}`} item={f} />
        ))}
      </div>
    </div>
  )
}

function FavoriteCard({ item }: { item: FavoriteItem }) {
  if (item.target_type === 'EXCURSION' && item.slug && item.title) {
    return (
      <ExcursionCard
        compact
        e={excursionCardPropsFromPartial({
          slug: item.slug,
          title: item.title,
          city_name: item.city_name,
          description: item.description,
          price_from: item.price_from,
          currency: item.currency,
          cover_image_url: item.cover_image_url,
          rating_avg: item.rating_avg,
          rating_count: item.rating_count,
        })}
      />
    )
  }
  if (item.target_type === 'GUIDE' && item.slug && item.title) {
    return (
      <Link to={`/guide/${item.slug}`} className="card flex items-center gap-3 transition hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <GuideAvatar avatar={item.avatar_url} name={item.title} className="h-14 w-14 rounded-2xl" />
        <div>
          <p className="text-xs text-stone-500">Гід</p>
          <h3 className="font-display font-semibold">{item.title}</h3>
        </div>
      </Link>
    )
  }
  return (
    <div className="card text-sm text-stone-500">
      {item.target_type} #{item.target_id} — недоступно
    </div>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!me) return
    setFirstName(me.first_name ?? '')
    setLastName(me.last_name ?? '')
  }, [me])

  const mutation = useMutation({
    mutationFn: () => authApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data)
      setSaved(true)
    },
  })

  return (
    <div className="card max-w-lg space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Налаштування</h1>
        <p className="mt-2 text-stone-600">Ім&apos;я та прізвище відображаються у ваших відгуках.</p>
      </div>
      <ApiErrorBanner error={mutation.error} className="mt-2" />
      {saved && !mutation.error && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Профіль збережено.
        </p>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Ім&apos;я</span>
        <input
          className="input"
          value={firstName}
          onChange={(e) => { setFirstName(e.target.value); setSaved(false) }}
          placeholder="Олена"
          disabled={mutation.isPending}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Прізвище</span>
        <input
          className="input"
          value={lastName}
          onChange={(e) => { setLastName(e.target.value); setSaved(false) }}
          placeholder="Коваленко"
          disabled={mutation.isPending}
        />
      </label>
      <p className="text-sm text-stone-500">Логін: {me?.login ?? '—'} · Email: {me?.email ?? '—'}</p>
      <button
        type="button"
        className="btn-primary"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  )
}
