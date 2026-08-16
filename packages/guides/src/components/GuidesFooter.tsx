import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@gaido/api-client/api/client'
import BrandLogo from './BrandLogo'
import { SITE_NAME } from '@gaido/site-urls/brand'
import { useTelegramBotURL } from '../hooks/useTelegramBotURL'

export default function GuidesFooter() {
  const { data } = useQuery({
    queryKey: ['site'],
    queryFn: () => catalogApi.site(),
    staleTime: 60_000,
  })

  const footer = data?.footer
  const telegramBotURL = useTelegramBotURL()

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
                  <a href={`tel:${footer.phone.replace(/\s/g, '')}`} className="link-accent mb-3 block font-display text-lg uppercase">
                    {footer.phone}
                  </a>
                </>
              )}
              {footer?.email && (
                <a href={`mailto:${footer.email}`} className="mb-3 block text-base text-ink-soft underline transition hover:text-muted">
                  {footer.email}
                </a>
              )}
              {telegramBotURL && (
                <button type="button" data-telegram className="mb-3 block text-left text-base text-ink-soft underline transition hover:text-muted">
                  Написати в Telegram
                </button>
              )}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-6">
            <p className="text-sm font-light text-muted-light">© {new Date().getFullYear()} {footer?.copyright ?? SITE_NAME}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
