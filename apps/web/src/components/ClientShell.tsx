'use client'

import { StrictMode, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { siteModeFromPath, sectionBasePathForMode, type SiteMode } from '@gaido/site-urls/site'
import { ApiClientError, bootstrapAuth } from '@gaido/api-client/api/http'
import { handleDynamicImportRejection } from '@gaido/ui-primitives/lazyImport'
import BodyFontSync from '@gaido/ui-primitives/BodyFontSync'
import { applyBodyFont } from '@gaido/ui-primitives/bodyFont'
import { UniqueDocumentTitle } from '@gaido/ui-primitives/useDocumentTitle'
import dynamic from 'next/dynamic'

const PortalApp = dynamic(() => import('../shells/PortalApp'), { ssr: false })
const SvitApp = dynamic(() => import('../shells/SvitApp'), { ssr: false })
const ServisApp = dynamic(() => import('../shells/ServisApp'), { ssr: false })
const VezuApp = dynamic(() => import('../shells/VezuApp'), { ssr: false })

function appForMode(mode: SiteMode): ComponentType {
  switch (mode) {
    case 'guides':
      return SvitApp
    case 'services':
      return ServisApp
    case 'transport':
      return VezuApp
    default:
      return PortalApp
  }
}

function DefaultSocialMeta() {
  // Per-page Helmet tags come from vertical Seo components after mount.
  return null
}

export function ClientShell({ pathname, children }: { pathname: string; children?: ReactNode }) {
  const mode = siteModeFromPath(pathname)
  const basename = sectionBasePathForMode(mode) || undefined
  const App = appForMode(mode)
  const [ready, setReady] = useState(false)

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiClientError && (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN')) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      }),
    [],
  )

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (handleDynamicImportRejection(event.reason)) {
        event.preventDefault()
      }
    }
    window.addEventListener('unhandledrejection', onRejection)
    void import('leaflet/dist/leaflet.css').catch(() => undefined)
    void import('@gaido/guides/lib/telegramButtons')
      .then((m) => m.initTelegramButtons())
      .catch(() => undefined)

    let cancelled = false
    const auth = bootstrapAuth().catch(() => undefined)
    const timeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1500)
    })
    void Promise.race([auth, timeout]).finally(() => {
      if (cancelled) return
      applyBodyFont('rubik')
      setReady(true)
    })

    return () => {
      cancelled = true
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (!ready) {
    return (
      <>
        {children}
        {pathname === '/' || pathname === '/svit' || pathname === '/servis' || pathname === '/vezu' ? null : (
          <div className="container-site py-12">
            <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
          </div>
        )}
      </>
    )
  }

  return (
    <StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={basename}>
            <BodyFontSync />
            <UniqueDocumentTitle />
            <DefaultSocialMeta />
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </StrictMode>
  )
}
