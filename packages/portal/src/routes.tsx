import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useLocation, useParams } from 'react-router-dom'
import { RoleGate } from '@gaido/ui-primitives/RoleGate'
import ExternalRedirect from '@gaido/ui-primitives/ExternalRedirect'
import { lazyImport } from '@gaido/ui-primitives/lazyImport'
import { guidesUrl, redirectToGuides, servicesUrl } from '@gaido/site-urls/site'

export function PageFallback() {
  return (
    <div className="container-site py-8">
      <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
    </div>
  )
}

export function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function GuidesCanonicalRedirect() {
  const location = useLocation()
  return <ExternalRedirect to={redirectToGuides(location.pathname, location.search, location.hash)} />
}

function ServicesProviderRedirect() {
  const { slug = '' } = useParams()
  return <ExternalRedirect to={servicesUrl(`/provider/${slug}`)} />
}

function PortalHomeRedirect() {
  return <Navigate to="/" replace />
}

const PortalStubPage = lazyImport(() => import('@gaido/portal-shell/pages/PortalStubPage'))
const LoginPage = lazyImport(() => import('@gaido/portal-shell/pages/AuthPages').then((m) => ({ default: m.default })))
const AdminPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('@gaido/portal-shell/pages/DeployPage'))

export function portalPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><PortalStubPage /></Lazy>} />
      <Route path="guides" element={<GuidesCanonicalRedirect />} />
      <Route path="guides/*" element={<GuidesCanonicalRedirect />} />
      <Route path="guide/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="search" element={<GuidesCanonicalRedirect />} />
      <Route path="map" element={<GuidesCanonicalRedirect />} />
      <Route path="journal" element={<GuidesCanonicalRedirect />} />
      <Route path="journal/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="excursion/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="excursions" element={<GuidesCanonicalRedirect />} />
      <Route path="city/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="countries" element={<GuidesCanonicalRedirect />} />
      <Route path="countries/*" element={<GuidesCanonicalRedirect />} />
      <Route path="ukrainians-in/:citySlug" element={<GuidesCanonicalRedirect />} />
      <Route path="discover" element={<ExternalRedirect to={servicesUrl('/')} />} />
      <Route path="provider/:slug" element={<ServicesProviderRedirect />} />
      <Route path="jobs" element={<PortalHomeRedirect />} />
      <Route path="places" element={<PortalHomeRedirect />} />
      <Route path="help" element={<PortalHomeRedirect />} />
      <Route path="looking" element={<PortalHomeRedirect />} />
      <Route path="about" element={<PortalHomeRedirect />} />
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="account/*" element={<GuidesCanonicalRedirect />} />
      <Route path="register" element={<GuidesCanonicalRedirect />} />
      <Route path="register/guide" element={<GuidesCanonicalRedirect />} />
      <Route path="legal/:slug" element={<GuidesCanonicalRedirect />} />
    </>
  )
}

export function portalAdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><Lazy><AdminPage /></Lazy></RoleGate>} />
      <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><Lazy><DeployPage /></Lazy></RoleGate>} />
      <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
      <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><Lazy><ModeratorPage /></Lazy></RoleGate>} />
    </>
  )
}

export { guidesUrl, servicesUrl }
