import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useParams, useLocation } from 'react-router-dom'
import { RoleGate } from '../components/RoleGate'
import { GuideGate } from '../components/GuideGate'
import GuideLayout from '../components/crm/GuideLayout'
import ExternalRedirect from '../components/ExternalRedirect'
import { lazyImport } from '../lib/lazyImport'
import { guidesUrl, redirectToGuides, servicesUrl } from '../lib/site'
import CityPage, { MapPage } from '../pages/CityMapPages'

export function PageFallback() {
  return (
    <>
      <div className="border-b border-divider bg-page">
        <div className="container-site py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-sand-100" aria-hidden />
        </div>
      </div>
      <div className="container-site py-8">
        <div className="h-9 w-64 max-w-full animate-pulse rounded bg-sand-100" aria-label="Завантаження" />
      </div>
    </>
  )
}

export function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

export function GuideCountryLegacyRedirect() {
  const { countrySlug = '' } = useParams()
  return <Navigate to={`/guides/countries/${countrySlug}`} replace />
}

export function GuidesCanonicalRedirect() {
  const location = useLocation()
  return <ExternalRedirect to={redirectToGuides(location.pathname, location.search, location.hash)} />
}

export function ServicesProviderRedirect() {
  const { slug = '' } = useParams()
  return <ExternalRedirect to={servicesUrl(`/provider/${slug}`)} />
}

export function PortalHomeRedirect() {
  return <Navigate to="/" replace />
}

const GuidesHomePage = lazyImport(() => import('../pages/GuidesHomePage'))
const PortalStubPage = lazyImport(() => import('../pages/PortalStubPage'))
const VezuStubPage = lazyImport(() => import('../pages/VezuStubPage'))
const SearchPage = lazyImport(() => import('../pages/SearchPage'))
const GuidePage = lazyImport(() => import('../pages/GuidePage'))
const ExcursionPage = lazyImport(() => import('../pages/ExcursionPage'))
const GuidesListPage = lazyImport(() => import('../pages/CatalogPages').then((m) => ({ default: m.default })))
const GuidesByCountryPage = lazyImport(() => import('../pages/CatalogPages').then((m) => ({ default: m.GuidesByCountryPage })))
const LoginPage = lazyImport(() => import('../pages/AuthPages').then((m) => ({ default: m.default })))
const RegisterTouristPage = lazyImport(() => import('../pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })))
const RegisterGuidePage = lazyImport(() => import('../pages/AuthPages').then((m) => ({ default: m.RegisterGuidePage })))
const LegalDocumentPage = lazyImport(() => import('../components/LegalContentEditor').then((m) => ({ default: m.LegalDocumentPage })))
const AccountPage = lazyImport(() => import('../pages/AccountPages').then((m) => ({ default: m.default })))
const FavoritesPage = lazyImport(() => import('../pages/AccountPages').then((m) => ({ default: m.FavoritesPage })))
const SettingsPage = lazyImport(() => import('../pages/AccountPages').then((m) => ({ default: m.SettingsPage })))
const GuideOverviewPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideOverviewPage })))
const GuideProfilePage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideProfilePage })))
const GuideBillingPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideBillingPage })))
const GuideDocumentsPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideDocumentsPage })))
const GuideExcursionsPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideExcursionsPage })))
const GuideCalendarPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideCalendarPage })))
const GuideArticlesPage = lazyImport(() => import('../pages/guide').then((m) => ({ default: m.GuideArticlesPage })))
const CreateExcursionPage = lazyImport(() => import('../pages/CreateExcursionPage'))
const EditExcursionPage = lazyImport(() => import('../pages/EditExcursionPage'))
const AdminPage = lazyImport(() => import('../pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('../pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('../pages/DeployPage'))
const JournalListPage = lazyImport(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalListPage })))
const JournalArticlePage = lazyImport(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalArticlePage })))
const AboutPage = lazyImport(() => import('../pages/AboutPage'))
const SeoCityPage = lazyImport(() => import('../pages/SeoCityPage'))

export function touristAccountRoutes() {
  return (
    <>
      <Route path="/account" element={<Lazy><AccountPage /></Lazy>} />
      <Route path="/account/favorites" element={<Lazy><FavoritesPage /></Lazy>} />
      <Route path="/account/settings" element={<Lazy><SettingsPage /></Lazy>} />
    </>
  )
}

export function guideAccountRoutes() {
  return (
    <>
      {touristAccountRoutes()}
      <Route path="/account/guide/billing" element={<GuideGate><Lazy><GuideBillingPage /></Lazy></GuideGate>} />
      <Route path="/account/guide" element={<GuideGate><GuideLayout /></GuideGate>}>
        <Route index element={<Lazy><GuideOverviewPage /></Lazy>} />
        <Route path="profile" element={<Lazy><GuideProfilePage /></Lazy>} />
        <Route path="documents" element={<Lazy><GuideDocumentsPage /></Lazy>} />
        <Route path="excursions/new" element={<Lazy><CreateExcursionPage /></Lazy>} />
        <Route path="excursions/:id/edit" element={<Lazy><EditExcursionPage /></Lazy>} />
        <Route path="excursions" element={<Lazy><GuideExcursionsPage /></Lazy>} />
        <Route path="articles" element={<Lazy><GuideArticlesPage /></Lazy>} />
        <Route path="calendar" element={<Lazy><GuideCalendarPage /></Lazy>} />
      </Route>
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

export function svitPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><GuidesHomePage /></Lazy>} />
      <Route path="guides" element={<Navigate to="/" replace />} />
      <Route path="discover" element={<ExternalRedirect to={servicesUrl('/')} />} />
      <Route path="provider/:slug" element={<PortalHomeRedirect />} />
      <Route path="jobs" element={<PortalHomeRedirect />} />
      <Route path="places" element={<PortalHomeRedirect />} />
      <Route path="help" element={<PortalHomeRedirect />} />
      <Route path="looking" element={<PortalHomeRedirect />} />
      <Route path="ukrainians-in/:citySlug" element={<Lazy><SeoCityPage /></Lazy>} />
      <Route path="search" element={<Lazy><SearchPage /></Lazy>} />
      <Route path="map" element={<MapPage />} />
      <Route path="city/:slug" element={<CityPage />} />
      <Route path="guides/countries" element={<Lazy><GuidesListPage /></Lazy>} />
      <Route path="guides/countries/:countrySlug" element={<Lazy><GuidesByCountryPage /></Lazy>} />
      <Route path="guides/:countrySlug" element={<GuideCountryLegacyRedirect />} />
      <Route path="guide/:slug" element={<Lazy><GuidePage /></Lazy>} />
      <Route path="excursions" element={<Navigate to="/search" replace />} />
      <Route path="excursion/:slug" element={<Lazy><ExcursionPage /></Lazy>} />
      <Route path="journal" element={<Lazy><JournalListPage /></Lazy>} />
      <Route path="journal/:slug" element={<Lazy><JournalArticlePage /></Lazy>} />
      <Route path="about" element={<Lazy><AboutPage /></Lazy>} />
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="register" element={<Lazy><RegisterTouristPage /></Lazy>} />
      <Route path="register/guide" element={<Lazy><RegisterGuidePage /></Lazy>} />
      <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
    </>
  )
}

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
      <Route path="ukrainians-in/:citySlug" element={<GuidesCanonicalRedirect />} />
      <Route path="discover" element={<ExternalRedirect to={servicesUrl('/')} />} />
      <Route path="provider/:slug" element={<ServicesProviderRedirect />} />
      <Route path="jobs" element={<PortalHomeRedirect />} />
      <Route path="places" element={<PortalHomeRedirect />} />
      <Route path="help" element={<PortalHomeRedirect />} />
      <Route path="looking" element={<PortalHomeRedirect />} />
      <Route path="about" element={<PortalHomeRedirect />} />
      <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
      <Route path="register" element={<GuidesCanonicalRedirect />} />
      <Route path="register/guide" element={<GuidesCanonicalRedirect />} />
      <Route path="legal/:slug" element={<GuidesCanonicalRedirect />} />
    </>
  )
}

export function vezuPublicRoutes() {
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

export function guidesCrossLinks() {
  return (
    <>
      <Route path="guides/*" element={<GuidesCanonicalRedirect />} />
      <Route path="guide/:slug" element={<GuidesCanonicalRedirect />} />
      <Route path="search" element={<GuidesCanonicalRedirect />} />
      <Route path="map" element={<GuidesCanonicalRedirect />} />
      <Route path="journal/*" element={<GuidesCanonicalRedirect />} />
      <Route path="excursion/:slug" element={<GuidesCanonicalRedirect />} />
    </>
  )
}

export { guidesUrl, servicesUrl }
