import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transportApi } from '@gaido/api-client/api/transport'
import { pageTitle } from '@gaido/site-urls/brand'
import { Seo } from '../../lib/seo'
import RideForm from '../../components/RideForm'
import RideCard from '../../components/RideCard'

function RidesListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-transport-rides'],
    queryFn: () => transportApi.myRides(),
  })

  return (
    <>
      <Seo title={pageTitle('Мої рейси')} path="/account/rides" noIndex />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="section-title-sm">Мої рейси</h1>
          <Link to="/account/rides/new" className="btn-accent">
            Додати рейс
          </Link>
        </div>
        {isLoading ? (
          <p className="text-muted">Завантаження…</p>
        ) : data?.items?.length ? (
          <div className="space-y-3">
            {data.items.map((ride) => (
              <div key={ride.id} className="space-y-2">
                <RideCard ride={ride} />
                <Link to={`/account/rides/${ride.id}/edit`} className="text-sm text-brand-700 hover:underline">
                  Редагувати
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-5 text-muted">
            У вас ще немає рейсів.{' '}
            <Link to="/account/rides/new" className="text-brand-700 hover:underline">
              Додати перший рейс
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

function RideNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (
    <>
      <Seo title={pageTitle('Новий рейс')} path="/account/rides/new" noIndex />
      <h1 className="section-title-sm mb-4">Новий рейс</h1>
      <RideForm
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['my-transport-rides'] })
          navigate('/account/rides')
        }}
        onCancel={() => navigate('/account/rides')}
      />
    </>
  )
}

function RideEditPage() {
  const { id } = useParams()
  const rideId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: rides } = useQuery({
    queryKey: ['my-transport-rides'],
    queryFn: () => transportApi.myRides(),
  })
  const ride = rides?.items.find((r) => r.id === rideId)

  const deleteMut = useMutation({
    mutationFn: () => transportApi.remove(rideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-transport-rides'] })
      navigate('/account/rides')
    },
  })

  if (!rides) return <p className="text-muted">Завантаження…</p>
  if (!ride) return <p className="text-muted">Рейс не знайдено</p>

  return (
    <>
      <Seo title={pageTitle('Редагування рейсу')} path={`/account/rides/${rideId}/edit`} noIndex />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title-sm">Редагування рейсу</h1>
        <button type="button" className="btn-ghost text-sm text-red-600" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
          Видалити
        </button>
      </div>
      <RideForm
        initial={ride}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['my-transport-rides'] })
          navigate('/account/rides')
        }}
        onCancel={() => navigate('/account/rides')}
      />
    </>
  )
}

export default function RidesAccountPage() {
  return (
    <Routes>
      <Route index element={<RidesListPage />} />
      <Route path="new" element={<RideNewPage />} />
      <Route path=":id/edit" element={<RideEditPage />} />
    </Routes>
  )
}
