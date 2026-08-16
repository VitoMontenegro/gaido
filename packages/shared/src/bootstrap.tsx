import { StrictMode, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ApiClientError, bootstrapAuth } from './api/http'
import { handleDynamicImportRejection } from './lib/lazyImport'
import { initTelegramButtons } from './lib/telegramButtons'
import './styles/globals.css'

const queryClient = new QueryClient({
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
})

type MountOptions = {
  leaflet?: boolean
  locationProvider?: ComponentType<{ children: ReactNode }>
}

function PassThrough({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function mountApp(App: ComponentType, options: MountOptions = {}) {
  if (options.leaflet) {
    void import('leaflet/dist/leaflet.css')
  }

  window.addEventListener('unhandledrejection', (event) => {
    if (handleDynamicImportRejection(event.reason)) {
      event.preventDefault()
    }
  })

  const LocationWrapper = options.locationProvider ?? PassThrough

  function renderApp() {
    initTelegramButtons()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <LocationWrapper>
                <App />
              </LocationWrapper>
            </BrowserRouter>
          </QueryClientProvider>
        </HelmetProvider>
      </StrictMode>,
    )
  }

  bootstrapAuth().finally(renderApp)
}
