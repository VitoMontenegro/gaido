import { Link } from 'react-router-dom'
import { legalPath } from './LegalContentEditor'
import { useCookieConsent } from '../hooks/useCookieConsent'

export default function CookieBanner() {
  const { visible, accept, submitting } = useCookieConsent()

  if (!visible) return null

  return (
    <div id="cookie-banner" className="pointer-events-none fixed bottom-6 left-0 z-[100] w-full">
      <div className="container-site">
        <div
          className="pointer-events-auto flex w-[92vw] flex-col gap-[14px] rounded-[5px] bg-white p-3 sm:w-[555px] sm:flex-row sm:gap-2.5 sm:p-[14px]"
          style={{ boxShadow: '0 4px 17px rgba(16, 24, 40, 0.08)' }}
        >
          <div className="text-[12px] leading-4 text-ink">
            Залишаючись на сайті, ви приймаєте{' '}
            <Link
              to={legalPath('site-rules')}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              умови використання файлів cookie
            </Link>{' '}
            та{' '}
            <Link
              to={legalPath('privacy')}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              політику обробки персональних даних
            </Link>
            .
          </div>
          <button
            type="button"
            id="accept-cookies"
            onClick={() => void accept()}
            disabled={submitting}
            className="mb-0.5 flex h-[34px] w-full min-w-[111px] shrink-0 items-center justify-center rounded-[25px] badge-teal text-[12px] font-medium text-white transition hover:badge-teal-600 disabled:opacity-60 sm:w-[111px] lg:text-sm"
          >
            Зрозуміло
          </button>
        </div>
      </div>
    </div>
  )
}
