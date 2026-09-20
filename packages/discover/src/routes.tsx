import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'
import ExternalRedirect from '@gaido/ui-primitives/ExternalRedirect'
import { lazyImport } from '@gaido/ui-primitives/lazyImport'
import { RoleGate } from '@gaido/ui-primitives/RoleGate'
import { redirectToGuides } from '@gaido/site-urls/site'

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

const DiscoverPage = lazyImport(() => import('@gaido/discover/pages/DiscoverPage'))
const ProviderPage = lazyImport(() => import('@gaido/discover/pages/ProviderPage'))
const ProviderAccountPage = lazyImport(() => import('@gaido/discover/pages/provider/ProviderAccountPage'))
const LoginPage = lazyImport(() => import('@gaido/discover/pages/AuthPages').then((m) => ({ default: m.default })))
const RegisterTouristPage = lazyImport(() => import('@gaido/discover/pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })))
const ForgotPasswordPage = lazyImport(() => import('@gaido/discover/pages/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazyImport(() => import('@gaido/discover/pages/AuthPages').then((m) => ({ default: m.ResetPasswordPage })))
const LegalDocumentPage = lazyImport(() => import('@gaido/discover/components/LegalDocumentPage'))
const AccountPage = lazyImport(() => import('@gaido/discover/pages/AccountPages').then((m) => ({ default: m.default })))
const FavoritesPage = lazyImport(() => import('@gaido/discover/pages/AccountPages').then((m) => ({ default: m.FavoritesPage })))
const SettingsPage = lazyImport(() => import('@gaido/discover/pages/AccountPages').then((m) => ({ default: m.SettingsPage })))
const AdminPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('@gaido/portal-shell/pages/DeployPage'))

export function discoverPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><DiscoverPage /></Lazy>} />
      <Route path="discover" element={<Navigate to="/" replace />} />
      <Route path="provider/:slug" element={<Lazy><ProviderPage /></Lazy>} />
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="register" element={<Lazy><RegisterTouristPage /></Lazy>} />
      <Route path="forgot-password" element={<Lazy><ForgotPasswordPage /></Lazy>} />
      <Route path="reset-password" element={<Lazy><ResetPasswordPage /></Lazy>} />
      <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
      <Route path="guides/*" element={<GuidesCanonicalRedirect />} />
      <Route path="guide/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="search" element={<GuidesCanonicalRedirect />} />
      <Route path="map" element={<GuidesCanonicalRedirect />} />
      <Route path="journal/*" element={<GuidesCanonicalRedirect />} />
      <Route path="excursion/:slug" element={<GuidesCanonicalRedirect />} />
    </>
  )
}

export function discoverAccountRoutes() {
  return (
    <>
      <Route path="/account" element={<Lazy><AccountPage /></Lazy>} />
      <Route path="/account/favorites" element={<Lazy><FavoritesPage /></Lazy>} />
      <Route path="/account/settings" element={<Lazy><SettingsPage /></Lazy>} />
      <Route path="/account/provider" element={<Lazy><ProviderAccountPage /></Lazy>} />
    </>
  )
}

export function discoverAdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><Lazy><AdminPage /></Lazy></RoleGate>} />
      <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><Lazy><DeployPage /></Lazy></RoleGate>} />
      <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
      <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><Lazy><ModeratorPage /></Lazy></RoleGate>} />
    </>
  )
}
