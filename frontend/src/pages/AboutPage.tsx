import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, resolveMediaUrl } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import { pageTitle } from '../lib/brand'
import { Seo } from '../lib/seo'

export default function AboutPage() {
  const { data: site, isLoading } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  const content = site?.home.content
  const title = content?.about_title || 'Про нас'
  const paragraphs = (content?.about_text ?? '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const image = resolveMediaUrl(content?.about_image_url ?? '')

  return (
    <>
      <Seo
        title={pageTitle(title)}
        description={paragraphs[0] ?? ''}
        path="/about"
      />
      <Breadcrumbs items={[{ label: title }]} />
      <article className="container-site py-10 md:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_min(420px,40%)]">
          <div>
            <h1 className="font-display text-3xl font-bold normal-case tracking-normal md:text-4xl">{title}</h1>
            {isLoading ? (
              <p className="mt-6 text-muted">Завантаження…</p>
            ) : paragraphs.length > 0 ? (
              <div className="mt-8 space-y-4">
                {paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-base leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-8 text-muted">Текст сторінки готується. Зверніться до адміністратора сайту.</p>
            )}
            <Link to="/" className="link-accent mt-8 inline-block text-sm normal-case">
              ← На головну
            </Link>
          </div>
          {image ? (
            <img src={image} alt="" className="aspect-4/3 w-full rounded-[28px] object-cover" loading="lazy" />
          ) : (
            <div className="aspect-4/3 rounded-[28px] bg-sand-100" />
          )}
        </div>
      </article>
    </>
  )
}
