import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AccountLayout } from '../layouts/MainLayout'
import { RoleGate } from '../components/RoleGate'
import { GuideGate } from '../components/GuideGate'
import GuideLayout from '../components/crm/GuideLayout'

const HomePage = lazy(() => import('../pages/HomePage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const GuidePage = lazy(() => import('../pages/GuidePage'))
const ExcursionPage = lazy(() => import('../pages/ExcursionPage'))
const GuidesListPage = lazy(() => import('../pages/CatalogPages').then((m) => ({ default: m.default })))
const GuidesByCountryPage = lazy(() => import('../pages/CatalogPages').then((m) => ({ default: m.GuidesByCountryPage })))
const LoginPage = lazy(() => import('../pages/AuthPages').then((m) => ({ default: m.default })))
const RegisterTouristPage = lazy(() => import('../pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })))
const RegisterGuidePage = lazy(() => import('../pages/AuthPages').then((m) => ({ default: m.RegisterGuidePage })))
const LegalDocumentPage = lazy(() => import('../components/LegalContentEditor').then((m) => ({ default: m.LegalDocumentPage })))
const AccountPage = lazy(() => import('../pages/AccountPages').then((m) => ({ default: m.default })))
const FavoritesPage = lazy(() => import('../pages/AccountPages').then((m) => ({ default: m.FavoritesPage })))
const SettingsPage = lazy(() => import('../pages/AccountPages').then((m) => ({ default: m.SettingsPage })))
const GuideOverviewPage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideOverviewPage })))
const GuideProfilePage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideProfilePage })))
const GuideBillingPage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideBillingPage })))
const GuideDocumentsPage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideDocumentsPage })))
const GuideExcursionsPage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideExcursionsPage })))
const GuideCalendarPage = lazy(() => import('../pages/guide').then((m) => ({ default: m.GuideCalendarPage })))
const CityPage = lazy(() => import('../pages/CityMapPages').then((m) => ({ default: m.default })))
const MapPage = lazy(() => import('../pages/CityMapPages').then((m) => ({ default: m.MapPage })))
const CreateExcursionPage = lazy(() => import('../pages/CreateExcursionPage'))
const EditExcursionPage = lazy(() => import('../pages/EditExcursionPage'))
const AdminPage = lazy(() => import('../pages/AdminPages').then((m) => ({ default: m.default })))
const ModeratorPage = lazy(() => import('../pages/AdminPages').then((m) => ({ default: m.ModeratorPage })))
const DeployPage = lazy(() => import('../pages/DeployPage'))
const JournalListPage = lazy(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalListPage })))
const JournalArticlePage = lazy(() => import('../pages/JournalPages').then((m) => ({ default: m.JournalArticlePage })))

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
