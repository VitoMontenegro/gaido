import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ApiClientError, bootstrapAuth } from '@gaido/api-client/api/http'
import { handleDynamicImportRejection } from '@gaido/ui-primitives/lazyImport'
import { initTelegramButtons } from './lib/telegramButtons'
import './styles/theme.css'

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

export function mountApp(App: ComponentType) {
  window.addEventListener('unhandledrejection', (event) => {
    if (handleDynamicImportRejection(event.reason)) {
      event.preventDefault()
    }
  })

  function renderApp() {
    initTelegramButtons()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </HelmetProvider>
      </StrictMode>,
    )
  }

  bootstrapAuth().finally(renderApp)
}
