import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi, type FooterContent } from '@gaido/api-client/api/client'
import BrandLogo from './BrandLogo'
import { SITE_NAME, SITE_TAGLINE } from '@gaido/site-urls/brand'
import { guidesUrl, portalUrl, servicesUrl } from '@gaido/site-urls/site'

export default function TransportFooter() {
  const { data } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  return (
    <SectionFooter
      footer={data?.footer_transport}
      aside={
        <>
          <a href={portalUrl('/')} className="hover:underline">Головна</a>
          <a href={guidesUrl('/')} className="hover:underline">Екскурсії</a>
          <a href={servicesUrl('/')} className="hover:underline">Сервіси</a>
        </>
      }
    />
  )
}

function SectionFooter({ footer, aside }: { footer?: FooterContent; aside: ReactNode }) {
  const telegram = footer?.telegram?.replace(/^@/, '')
  const columns = footer?.columns ?? []

  return (
    <footer className="pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <div className="flex flex-wrap items-start gap-8 md:gap-16">
            <div className="w-full shrink-0 md:w-[312px]">
              <BrandLogo className="mb-3" showTagline />
              {footer?.phone && (
                <a href={`tel:${footer.phone.replace(/\s/g, '')}`} className="link-accent mb-3 block font-display text-lg uppercase">
                  {footer.phone}
                </a>
              )}
              {footer?.email && (
                <a href={`mailto:${footer.email}`} className="mb-3 block text-base text-ink-soft underline transition hover:text-muted">
                  {footer.email}
                </a>
              )}
              {telegram && (
                <a href={`https://t.me/${telegram}`} target="_blank" rel="noreferrer" className="mb-3 block text-base text-ink-soft underline transition hover:text-muted">
                  Telegram {telegram}
                </a>
              )}
              <p className="mt-2 max-w-sm whitespace-pre-line text-sm leading-relaxed text-muted">
                {footer?.description || SITE_TAGLINE}
              </p>
            </div>

            {columns.length > 0 && (
              <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row">
                {columns.map((col) => (
                  <div key={col.title} className="min-w-0 flex-1">
                    <p className="mb-3 font-display text-lg font-medium uppercase text-ink">{col.title}</p>
                    <ul className="space-y-2">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          {link.url.startsWith('http') ? (
                            <a href={link.url} className="text-base text-[#4b4b4b] transition hover:underline" target="_blank" rel="noreferrer">
                              {link.label}
                            </a>
                          ) : (
                            <Link to={link.url} className="text-base text-[#4b4b4b] transition hover:underline">
                              {link.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-divider pt-6 text-sm text-muted">
            {aside}
            <p className="ml-auto text-xs text-muted-light">© {new Date().getFullYear()} {footer?.copyright || SITE_NAME}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
