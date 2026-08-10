import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../api/client'
import BrandLogo from './BrandLogo'
import { SITE_NAME } from '../lib/brand'

export default function SiteFooter() {
  const { data } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  const footer = data?.footer

  return (
    <footer className="pb-5 pt-8">
      <div className="container-site">
        <div className="rounded-[28px] bg-surface p-7 md:p-9">
          <div className="flex flex-wrap items-start gap-8 md:gap-16">
            <div className="w-full shrink-0 md:w-[312px]">
              <BrandLogo className="mb-5" showTagline />

              {footer?.phone && (
                <>
                  <p className="badge-teal mb-2">Пн–Нд 09:00 – 18:00</p>
                  <a
                    href={`tel:${footer.phone.replace(/\s/g, '')}`}
                    className="link-accent mb-3 block font-display text-lg uppercase"
                  >
                    {footer.phone}
                  </a>
                </>
              )}

              {footer?.email && (
                <a href={`mailto:${footer.email}`} className="mb-3 block text-base text-ink-soft underline transition hover:text-muted">
                  {footer.email}
                </a>
              )}

              {footer?.telegram && (
                <a
                  href={`https://t.me/${footer.telegram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 block text-base text-ink-soft underline transition hover:text-muted"
                >
                  Telegram {footer.telegram}
                </a>
              )}

              {footer?.description && (
                <p className="mt-2 max-w-sm whitespace-pre-line text-sm leading-relaxed text-muted">{footer.description}</p>
              )}
            </div>

            {(footer?.columns ?? []).length > 0 && (
              <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row">
                {footer!.columns.map((col) => (
                  <div key={col.title} className="min-w-0 flex-1">
                    <p className="mb-3 font-display text-lg font-medium uppercase text-ink">{col.title}</p>
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-6">
            <p className="text-sm font-light text-muted-light">
              © {new Date().getFullYear()} {footer?.copyright ?? SITE_NAME}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
