import { type ReactNode } from 'react'
import { staticAssetUrl } from '@gaido/site-urls/staticAsset'
import { sanitizeHtml } from '../lib/html'

const HERO_IMAGE = staticAssetUrl('/images/home/hero-svit.jpg')

type Props = {
  heading: string
  eyebrow?: string
  subtitle: string
  stats?: ReactNode
}

export default function HomeHero({ heading, eyebrow, subtitle, stats }: Props) {
  return (
    <section className="home-hero-v2 relative isolate overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
        decoding="sync"
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-ink/70 via-ink/35 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/35 to-transparent"
        aria-hidden
      />

      <div className="home-hero-v2__copy container-site relative z-10 flex flex-col justify-center pb-10 pt-24 md:pb-12 md:pt-28">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium text-white md:text-base">{eyebrow}</p>
        ) : null}
        <h1 className="max-w-3xl font-display text-[28px] font-medium uppercase leading-[1.15] text-white sm:text-4xl">
          {heading}
        </h1>
        {subtitle.trim() ? (
          <p
            className="mt-3 max-w-2xl text-base leading-relaxed text-white md:text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }}
          />
        ) : null}

        {stats}

      </div>
    </section>
  )
}
