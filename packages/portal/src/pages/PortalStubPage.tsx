import BrandLogo from '../components/BrandLogo'
import { pageTitle, SITE_TAGLINE } from '@gaido/site-urls/brand'
import { guidesUrl } from '@gaido/site-urls/site'
import { Seo } from '../lib/seo'

/** Root gaido.top — no “coming soon”; point visitors to the live guides product. */
export default function PortalStubPage() {
  return (
    <>
      <Seo
        title={pageTitle('Gaido')}
        description="Українські гіди та авторські екскурсії — каталог на svit.gaido.top."
        path="/"
      />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="container-site flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center py-16 text-center">
          <BrandLogo variant="inverse" showTagline asLink={false} className="mb-8 justify-center" />
          <p className="text-sm uppercase tracking-[0.2em] text-brand-300">🇺🇦 {SITE_TAGLINE}</p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-medium uppercase md:text-5xl">
            Гіди та екскурсії
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Каталог українських гідів і авторських екскурсій — знаходьте своїх і звʼязуйтеся напряму.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={guidesUrl('/')} className="btn-primary">
              Відкрити каталог →
            </a>
            <a href={guidesUrl('/register/guide')} className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15">
              Стати гідом
            </a>
          </div>
          <p className="mt-8 text-sm text-white/60">
            <a href={guidesUrl('/')} className="underline transition hover:text-white">svit.gaido.top</a>
          </p>
        </div>
      </section>
    </>
  )
}
