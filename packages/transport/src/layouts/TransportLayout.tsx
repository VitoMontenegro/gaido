import { Outlet } from 'react-router-dom'
import ErrorBoundary from '@gaido/ui-primitives/ErrorBoundary'
import TransportHeader from '../components/TransportHeader'
import TransportFooter from '../components/TransportFooter'
import CookieBanner from '../components/CookieBanner'

export function TransportPublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TransportHeader />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <TransportFooter />
      <CookieBanner />
    </div>
  )
}
