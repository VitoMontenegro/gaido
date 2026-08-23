import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'
import { RoleGate } from '@gaido/ui-primitives/RoleGate'
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

const HomePage = lazyImport(() => import('@gaido/transport/pages/HomePage'))
const SearchPage = lazyImport(() => import('@gaido/transport/pages/SearchPage'))
const CarriersPage = lazyImport(() => import('@gaido/transport/pages/CarriersPage'))
const CitiesPage = lazyImport(() => import('@gaido/transport/pages/CitiesPage'))
const CityHubPage = lazyImport(() => import('@gaido/transport/pages/CityHubPage'))
const RoutePage = lazyImport(() => import('@gaido/transport/pages/RoutePage'))
const RideDetailPage = lazyImport(() => import('@gaido/transport/pages/RideDetailPage'))
const LoginPage = lazyImport(() => import('@gaido/transport/pages/AuthPages'))
const RegisterTouristPage = lazyImport(() => import('@gaido/transport/pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })))
const RegisterDriverPage = lazyImport(() => import('@gaido/transport/pages/AuthPages').then((m) => ({ default: m.RegisterDriverPage })))
const LegalDocumentPage = lazyImport(() => import('@gaido/transport/components/LegalDocumentPage'))
const RidesAccountPage = lazyImport(() => import('@gaido/transport/pages/account/RidesAccountPage'))
const CarrierAccountPage = lazyImport(() => import('@gaido/transport/pages/account/CarrierAccountPage'))
const CarrierProfilePage = lazyImport(() => import('@gaido/transport/pages/CarrierProfilePage'))
const BookingsAccountPage = lazyImport(() => import('@gaido/transport/pages/account/BookingsAccountPage'))
const CarrierBillingPage = lazyImport(() => import('@gaido/transport/pages/account/CarrierBillingPage'))
const AdminPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('@gaido/portal-shell/pages/DeployPage'))

export function transportPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><HomePage /></Lazy>} />
      <Route path="search" element={<Lazy><SearchPage /></Lazy>} />
      <Route path="carriers" element={<Lazy><CarriersPage /></Lazy>} />
      <Route path="carriers/:slug" element={<Lazy><CarrierProfilePage /></Lazy>} />
      <Route path="cities" element={<Lazy><CitiesPage /></Lazy>} />
      <Route path="cities/:slug" element={<Lazy><CityHubPage /></Lazy>} />
      <Route path="routes/:fromSlug/:toSlug" element={<Lazy><RoutePage /></Lazy>} />
      <Route path="rides/:id" element={<Lazy><RideDetailPage /></Lazy>} />
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="register" element={<Lazy><RegisterTouristPage /></Lazy>} />
      <Route path="register/driver" element={<Lazy><RegisterDriverPage /></Lazy>} />
      <Route path="guides/*" element={<GuidesCanonicalRedirect />} />
      <Route path="guide/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="map" element={<GuidesCanonicalRedirect />} />
      <Route path="journal/*" element={<GuidesCanonicalRedirect />} />
      <Route path="excursion/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
    </>
  )
}

export function transportAccountRoutes() {
  return (
    <>
      <Route path="/account/rides/*" element={<Lazy><RidesAccountPage /></Lazy>} />
      <Route path="/account/bookings/*" element={<Lazy><BookingsAccountPage /></Lazy>} />
      <Route path="/account/carrier/billing/*" element={<Lazy><CarrierBillingPage /></Lazy>} />
      <Route path="/account/carrier/*" element={<Lazy><CarrierAccountPage /></Lazy>} />
      <Route path="/account" element={<Navigate to="/account/bookings" replace />} />
    </>
  )
}

export function transportAdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><Lazy><AdminPage /></Lazy></RoleGate>} />
      <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><Lazy><DeployPage /></Lazy></RoleGate>} />
      <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
      <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><Lazy><ModeratorPage /></Lazy></RoleGate>} />
    </>
  )
}
