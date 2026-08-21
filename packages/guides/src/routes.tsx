import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, useParams } from 'react-router-dom'
import { GuideGate } from '@gaido/ui-primitives/GuideGate'
import { RoleGate } from '@gaido/ui-primitives/RoleGate'
import GuideLayout from './components/crm/GuideLayout'
import ExternalRedirect from '@gaido/ui-primitives/ExternalRedirect'
import { lazyImport } from '@gaido/ui-primitives/lazyImport'
import { servicesUrl } from '@gaido/site-urls/site'
import CityPage, { MapPage } from './pages/CityMapPages'

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

function GuideCountryLegacyRedirect() {
  const { countrySlug = '' } = useParams()
  return <Navigate to={`/guides/countries/${countrySlug}`} replace />
}

function PortalHomeRedirect() {
  return <Navigate to="/" replace />
}

const GuidesHomePage = lazyImport(() => import('@gaido/guides/pages/GuidesHomePage'))
const SearchPage = lazyImport(() => import('@gaido/guides/pages/SearchPage'))
const GuidePage = lazyImport(() => import('@gaido/guides/pages/GuidePage'))
const ExcursionPage = lazyImport(() => import('@gaido/guides/pages/ExcursionPage'))
const GuidesListPage = lazyImport(() => import('@gaido/guides/pages/CatalogPages').then((m) => ({ default: m.default })))
const GuidesByCountryPage = lazyImport(() => import('@gaido/guides/pages/CatalogPages').then((m) => ({ default: m.GuidesByCountryPage })))
const LoginPage = lazyImport(() => import('@gaido/guides/pages/AuthPages').then((m) => ({ default: m.default })))
const RegisterTouristPage = lazyImport(() => import('@gaido/guides/pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })))
const RegisterGuidePage = lazyImport(() => import('@gaido/guides/pages/AuthPages').then((m) => ({ default: m.RegisterGuidePage })))
const LegalDocumentPage = lazyImport(() => import('@gaido/guides/components/LegalContentEditor').then((m) => ({ default: m.LegalDocumentPage })))
const AccountPage = lazyImport(() => import('@gaido/guides/pages/AccountPages').then((m) => ({ default: m.default })))
const FavoritesPage = lazyImport(() => import('@gaido/guides/pages/AccountPages').then((m) => ({ default: m.FavoritesPage })))
const SettingsPage = lazyImport(() => import('@gaido/guides/pages/AccountPages').then((m) => ({ default: m.SettingsPage })))
const GuideOverviewPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideOverviewPage })))
const GuideProfilePage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideProfilePage })))
const GuideBillingPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideBillingPage })))
const GuideDocumentsPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideDocumentsPage })))
const GuideExcursionsPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideExcursionsPage })))
const GuideCalendarPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideCalendarPage })))
const GuideArticlesPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideArticlesPage })))
const GuideInstructionsPage = lazyImport(() => import('@gaido/guides/pages/guide').then((m) => ({ default: m.GuideInstructionsPage })))
const CreateExcursionPage = lazyImport(() => import('@gaido/guides/pages/CreateExcursionPage'))
const EditExcursionPage = lazyImport(() => import('@gaido/guides/pages/EditExcursionPage'))
const JournalListPage = lazyImport(() => import('@gaido/guides/pages/JournalPages').then((m) => ({ default: m.JournalListPage })))
const JournalArticlePage = lazyImport(() => import('@gaido/guides/pages/JournalPages').then((m) => ({ default: m.JournalArticlePage })))
const AboutPage = lazyImport(() => import('@gaido/guides/pages/AboutPage'))
const SeoCityPage = lazyImport(() => import('@gaido/guides/pages/SeoCityPage'))
const CountryExcursionsPage = lazyImport(() => import('@gaido/guides/pages/CountryExcursionsPage'))
const AdminPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('@gaido/portal-shell/pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('@gaido/portal-shell/pages/DeployPage'))

export function guideAccountRoutes() {
  return (
    <>
      <Route path="/account" element={<Lazy><AccountPage /></Lazy>} />
      <Route path="/account/favorites" element={<Lazy><FavoritesPage /></Lazy>} />
      <Route path="/account/settings" element={<Lazy><SettingsPage /></Lazy>} />
      <Route path="/account/guide/billing" element={<GuideGate><Lazy><GuideBillingPage /></Lazy></GuideGate>} />
      <Route path="/account/guide/instructions" element={<GuideGate><Lazy><GuideInstructionsPage /></Lazy></GuideGate>} />
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

export function svitPublicRoutes() {
  return (
    <>
      <Route index element={<Lazy><GuidesHomePage /></Lazy>} />
      <Route path="guides/countries/:countrySlug" element={<Lazy><GuidesByCountryPage /></Lazy>} />
      <Route path="guides/countries" element={<Navigate to="/guides" replace />} />
      <Route path="guides/:countrySlug" element={<GuideCountryLegacyRedirect />} />
      <Route path="guides" element={<Lazy><GuidesListPage /></Lazy>} />
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
      <Route path="countries/:countrySlug" element={<Lazy><CountryExcursionsPage /></Lazy>} />
      <Route path="countries" element={<Navigate to="/search" replace />} />
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

export function svitAdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><Lazy><AdminPage /></Lazy></RoleGate>} />
      <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><Lazy><DeployPage /></Lazy></RoleGate>} />
      <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
      <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><Lazy><ModeratorPage /></Lazy></RoleGate>} />
    </>
  )
}
