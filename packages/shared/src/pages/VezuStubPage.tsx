import BrandLogo from '../components/BrandLogo'
import { pageTitle, SITE_TAGLINE } from '../lib/brand'
import { guidesUrl, portalUrl, servicesUrl } from '../lib/site'
import { Seo } from '../lib/seo'

export default function VezuStubPage() {
  return (
    <>
      <Seo
        title={pageTitle('Міжнародні перевезення')}
        description="Міжнародні перевезення для українців — окремий розділ Gaido. Скоро на vezu.gaido.top."
        path="/"
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="container-site flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center py-16 text-center">
          <BrandLogo variant="inverse" showTagline asLink={false} className="mb-8 justify-center" />
          <p className="text-sm uppercase tracking-[0.2em] text-brand-300">🇺🇦 {SITE_TAGLINE}</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-medium uppercase md:text-5xl">
            Міжнародні перевезення — незабаром
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Окремий продукт для перевезень між країнами. Локальний трансфер і таксі залишаються в розділі
            послуг поруч — на servis.gaido.top.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={servicesUrl('/')} className="btn-primary">
              Послуги поруч →
            </a>
            <a href={guidesUrl('/')} className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15">
              Гіди
            </a>
            <a href={portalUrl('/')} className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15">
              gaido.top
            </a>
          </div>
          <p className="mt-8 text-sm text-white/60">
            <a href={servicesUrl('/')} className="underline transition hover:text-white">servis.gaido.top</a>
            {' · '}
            <a href={guidesUrl('/')} className="underline transition hover:text-white">svit.gaido.top</a>
            {' · '}
            <a href={portalUrl('/')} className="underline transition hover:text-white">gaido.top</a>
          </p>
        </div>
      </section>
    </>
  )
}
