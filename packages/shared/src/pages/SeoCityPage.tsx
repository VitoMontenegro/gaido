import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/catalog'
import { useLocation } from '../contexts/LocationContext'
import { Seo } from '../lib/seo'
import { pageTitle } from '../lib/brand'

export default function SeoCityPage() {
  const { citySlug = '' } = useParams()
  const navigate = useNavigate()
  const loc = useLocation()
  const { data: city } = useQuery({
    queryKey: ['city', citySlug],
    queryFn: () => catalogApi.city(citySlug),
    enabled: Boolean(citySlug),
  })

  useEffect(() => {
    if (city) {
      loc.setCity({ id: city.id, slug: city.slug, name: city.name })
      navigate(`/discover?city_id=${city.id}`, { replace: true })
    }
  }, [city, loc, navigate])

  return (
    <>
      <Seo
        title={pageTitle(`Українці в ${city?.name ?? citySlug}`)}
        description={`Українські послуги та ресурси в ${city?.name ?? citySlug} та поруч.`}
        path={`/ukrainians-in/${citySlug}`}
      />
      <div className="container-site py-12 text-muted">Перенаправлення…</div>
    </>
  )
}
