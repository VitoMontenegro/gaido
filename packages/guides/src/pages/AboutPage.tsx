import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, resolveMediaUrl } from '@gaido/api-client/api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import { pageTitle, SITE_TAGLINE } from '@gaido/site-urls/brand'
import { normalizeAboutContent } from '../lib/aboutPageContent'
import { Seo } from '../lib/seo'

const AUDIENCE_ICONS = [
  (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
]

export default function AboutPage() {
  const { data: site } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  const about = normalizeAboutContent(site?.about)
  const image = resolveMediaUrl(site?.home.content.about_image_url ?? '')

  return (
    <>
      <Seo
        title={pageTitle(about.hero_eyebrow)}
        description={about.hero_lead}
        path="/about"
      />
      <Breadcrumbs items={[{ label: about.hero_eyebrow }]} />

      <section className="about-hero relative isolate overflow-hidden bg-ink text-white">
        {image && (
          <>
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/75 to-ink/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/35" />
          </>
        )}
        <div className="container-site relative z-10 py-16 md:py-24">
          <p className="about-hero__eyebrow">{about.hero_eyebrow}</p>
          <h1 className="about-hero__title">{about.hero_title}</h1>
          <p className="about-hero__lead">{about.hero_lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/search" className="btn-accent min-h-11 px-6">
              Знайти екскурсію
            </Link>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/25 bg-white/10 px-5 text-base font-medium text-white transition hover:bg-white/20"
            >
              Дивитись гідів
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface py-14 md:py-20">
        <div className="container-site">
          <div className="about-story">
            <div className="about-story__content">
              <h2 className="section-title-sm mb-6">Наша місія</h2>
              <div className="space-y-5">
                {about.story.map((paragraph, i) => (
                  <p key={i} className="text-base leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            {image && (
              <div className="about-story__media">
                <img src={image} alt="" className="about-story__img" loading="lazy" />
                <div className="about-story__badge">
                  <span className="badge-teal">{SITE_TAGLINE}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-divider bg-sand-50 py-14 md:py-16">
        <div className="container-site max-w-4xl text-center">
          <div className="about-quote mx-auto">
            <span className="about-quote__mark" aria-hidden>“</span>
            <blockquote className="about-quote__text">{about.belief}</blockquote>
          </div>
        </div>
      </section>

      <section className="bg-surface py-14 md:py-20">
        <div className="container-site">
          <div className="mb-10 max-w-2xl">
            <h2 className="section-title">{about.audience_title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted">{about.audience_lead}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {about.audience.map((item, i) => (
              <article key={item.title} className="about-audience-card">
                <div className="about-audience-card__icon">{AUDIENCE_ICONS[i % AUDIENCE_ICONS.length]}</div>
                <h3 className="about-audience-card__title">{item.title}</h3>
                <p className="about-audience-card__text">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-page py-14 md:py-16">
        <div className="container-site max-w-3xl space-y-6">
          <div className="about-note">
            <p className="about-note__label">Важливо</p>
            <p className="about-note__text">{about.disclaimer}</p>
          </div>
          <p className="text-base leading-relaxed text-muted">{about.mission}</p>
        </div>
      </section>

      <section className="container-site pb-16 pt-4 md:pb-20">
        <div className="cta-panel grid gap-8 p-8 text-center md:p-12 lg:p-14">
          <div className="mx-auto max-w-2xl">
            <p className="font-display text-2xl font-medium uppercase leading-snug text-white sm:text-3xl">
              {about.tagline}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-white/75">{about.closing}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/search" className="btn-accent min-w-45 justify-center px-6">
              Знайти екскурсію
            </Link>
            <Link
              to="/map"
              className="inline-flex min-h-10 min-w-45 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-base font-medium text-white transition hover:bg-white/20"
            >
              Карта напрямків
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
