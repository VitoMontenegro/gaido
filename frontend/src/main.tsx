import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ApiClientError, bootstrapAuth } from './api/http'
import App from './app/App'
import { handleDynamicImportRejection } from './lib/lazyImport'
import { initTelegramButtons } from './lib/telegramButtons'
import './styles/globals.css'

window.addEventListener('unhandledrejection', (event) => {
  if (handleDynamicImportRejection(event.reason)) {
    event.preventDefault()
  }
})

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
