import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/catalog'
import { servicesUrl } from '@gaido/site-urls/site'
import { Seo } from '../lib/seo'
import { pageTitle } from '@gaido/site-urls/brand'

export default function SeoCityPage() {
  const { citySlug = '' } = useParams()
  const { data: city } = useQuery({
    queryKey: ['city', citySlug],
    queryFn: () => catalogApi.city(citySlug),
    enabled: Boolean(citySlug),
  })

  useEffect(() => {
    if (city) {
      window.location.replace(servicesUrl(`/?city_id=${city.id}`))
    }
  }, [city])

  return (
    <>
      <Seo
        title={pageTitle(`Українці в ${city?.name ?? citySlug}`)}
        description={`Українські послуги та ресурси в ${city?.name ?? citySlug} та поруч.`}
        path={`/ukrainians-in/${citySlug}`}
        noIndex
      />
      <div className="container-site py-12 text-muted">Перенаправлення…</div>
    </>
  )
}
