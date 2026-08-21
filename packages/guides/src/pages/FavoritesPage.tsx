import { Link } from 'react-router-dom'
import { HeartIcon } from '@heroicons/react/24/outline'
import ExcursionCard, { excursionCardPropsFromPartial } from '../components/ExcursionCard'
import GuideAvatar from '../components/GuideAvatar'
import ApiErrorBanner from '../components/ApiErrorBanner'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'
import { useFavoriteItems } from '../hooks/useFavorites'
import type { FavoriteItem } from '@gaido/api-client/api/types/catalog'
import { getAccessToken } from '@gaido/api-client/api/http'

export default function FavoritesPage() {
  const { items, isLoading, isError, error } = useFavoriteItems()
  const guest = !getAccessToken()

  return (
    <>
      <Seo title={pageTitle('Обране')} path="/favorites" noIndex />
      <div className="container-site space-y-6 py-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Обране</h1>
          <p className="mt-1 text-sm text-stone-600">Екскурсії та гіди, які ви зберегли для майбутніх подорожей</p>
        </div>

        {isError && <ApiErrorBanner error={error} />}
        {isLoading && <div className="card text-sm text-stone-500">Завантаження…</div>}

        {!isLoading && items.length === 0 && (
          <div className="card space-y-4 text-center">
            <HeartIcon className="mx-auto h-10 w-10 text-stone-300" aria-hidden />
            <p className="text-stone-600">Поки нічого не збережено.</p>
            <p className="text-sm text-muted">Натисніть сердечко на екскурсії — вона зʼявиться тут.</p>
            {guest && (
              <p className="text-sm text-muted">
                <Link to="/login" state={{ from: '/favorites' }} className="font-medium text-teal hover:underline">
                  Увійдіть
                </Link>
                , щоб синхронізувати обране в акаунті.
              </p>
            )}
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
    </>
  )
}

function FavoriteCard({ item }: { item: FavoriteItem }) {
  if (item.target_type === 'EXCURSION' && item.slug && item.title) {
    return (
      <ExcursionCard
        compact
        e={excursionCardPropsFromPartial({
          id: item.target_id,
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
