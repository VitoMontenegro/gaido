import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AccountLayout } from '../layouts/MainLayout'
import { RoleGate } from '../components/RoleGate'
import { GuideGate } from '../components/GuideGate'
import GuideLayout from '../components/crm/GuideLayout'
import { lazyImport } from '../lib/lazyImport'

const HomePage = lazyImport(() => import('../pages/HomePage'))
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
const CityPage = lazyImport(() => import('../pages/CityMapPages').then((m) => ({ default: m.default })))
const MapPage = lazyImport(() => import('../pages/CityMapPages').then((m) => ({ default: m.MapPage })))
const CreateExcursionPage = lazyImport(() => import('../pages/CreateExcursionPage'))
const EditExcursionPage = lazyImport(() => import('../pages/EditExcursionPage'))
const AdminPage = lazyImport(() => import('../pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazyImport(() => import('../pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazyImport(() => import('../pages/DeployPage'))
const JournalListPage = lazyImport(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalListPage })))
const JournalArticlePage = lazyImport(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalArticlePage })))

function PageFallback() {
  return (
    <div className="container-site py-12">
      <div className="card text-muted">Завантаження…</div>
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Lazy><HomePage /></Lazy>} />
        <Route path="search" element={<Lazy><SearchPage /></Lazy>} />
        <Route path="map" element={<Lazy><MapPage /></Lazy>} />
        <Route path="city/:slug" element={<Lazy><CityPage /></Lazy>} />
        <Route path="guides" element={<Lazy><GuidesListPage /></Lazy>} />
        <Route path="guides/:countrySlug" element={<Lazy><GuidesByCountryPage /></Lazy>} />
        <Route path="guide/:slug" element={<Lazy><GuidePage /></Lazy>} />
        <Route path="excursions" element={<Navigate to="/search" replace />} />
        <Route path="excursion/:slug" element={<Lazy><ExcursionPage /></Lazy>} />
        <Route path="journal" element={<Lazy><JournalListPage /></Lazy>} />
        <Route path="journal/:slug" element={<Lazy><JournalArticlePage /></Lazy>} />
        <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="register" element={<Lazy><RegisterTouristPage /></Lazy>} />
        <Route path="register/guide" element={<Lazy><RegisterGuidePage /></Lazy>} />
        <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
      </Route>

      <Route element={<AccountLayout />}>
        <Route path="/account" element={<Lazy><AccountPage /></Lazy>} />
        <Route path="/account/favorites" element={<Lazy><FavoritesPage /></Lazy>} />
        <Route path="/account/settings" element={<Lazy><SettingsPage /></Lazy>} />
        <Route path="/account/guide" element={<GuideGate><GuideLayout /></GuideGate>}>
          <Route index element={<Lazy><GuideOverviewPage /></Lazy>} />
          <Route path="profile" element={<Lazy><GuideProfilePage /></Lazy>} />
          <Route path="billing" element={<Lazy><GuideBillingPage /></Lazy>} />
          <Route path="documents" element={<Lazy><GuideDocumentsPage /></Lazy>} />
          <Route path="excursions/new" element={<Lazy><CreateExcursionPage /></Lazy>} />
          <Route path="excursions/:id/edit" element={<Lazy><EditExcursionPage /></Lazy>} />
          <Route path="excursions" element={<Lazy><GuideExcursionsPage /></Lazy>} />
          <Route path="calendar" element={<Lazy><GuideCalendarPage /></Lazy>} />
        </Route>
        <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><Lazy><AdminPage /></Lazy></RoleGate>} />
        <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><Lazy><DeployPage /></Lazy></RoleGate>} />
        <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
        <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><Lazy><ModeratorPage /></Lazy></RoleGate>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
