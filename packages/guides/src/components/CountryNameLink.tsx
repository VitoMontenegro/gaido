import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import { useMemo } from 'react'

function useCountryGuideSlugs() {
  const { data } = useQuery({
    queryKey: ['countries-with-guides'],
    queryFn: () => catalogApi.countriesWithGuides(),
    staleTime: 60_000,
  })
  return useMemo(() => new Set((data?.items ?? []).map((c) => c.slug)), [data?.items])
}

/** Country name → `/guides/countries/:slug` when that country has published guides. */
export default function CountryNameLink({
  slug,
  name,
  className,
}: {
  slug: string
  name: string
  className?: string
}) {
  const guideSlugs = useCountryGuideSlugs()
  if (guideSlugs.has(slug)) {
    return (
      <Link to={`/countries/${slug}`} className={[className, 'transition hover:underline'].filter(Boolean).join(' ')}>
        {name}
      </Link>
    )
  }
  return className ? <span className={className}>{name}</span> : name
}
