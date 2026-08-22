import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'
import ExternalRedirect from '@gaido/ui-primitives/ExternalRedirect'
import { lazyImport } from '@gaido/ui-primitives/lazyImport'
import { redirectToGuides } from '@gaido/site-urls/site'

export function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="container-site py-8 text-muted">Завантаження…</div>}>{children}</Suspense>
}

function GuidesCanonicalRedirect() {
  const location = useLocation()
  return <ExternalRedirect to={redirectToGuides(location.pathname, location.search, location.hash)} />
}

function PortalHomeRedirect() {
  return <Navigate to="/" replace />
}

const VezuStubPage = lazyImport(() => import('@gaido/transport/pages/VezuStubPage'))
const LegalDocumentPage = lazyImport(() => import('@gaido/transport/components/LegalDocumentPage'))

export function transportPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><VezuStubPage /></Lazy>} />
      <Route path="discover" element={<PortalHomeRedirect />} />
      <Route path="provider/:slug" element={<PortalHomeRedirect />} />
      <Route path="guides/*" element={<GuidesCanonicalRedirect />} />
      <Route path="guide/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="search" element={<GuidesCanonicalRedirect />} />
      <Route path="map" element={<GuidesCanonicalRedirect />} />
      <Route path="journal/*" element={<GuidesCanonicalRedirect />} />
      <Route path="excursion/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
    </>
  )
}
