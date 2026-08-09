import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AccountLayout } from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import SearchPage from '../pages/SearchPage'
import GuidePage from '../pages/GuidePage'
import ExcursionPage from '../pages/ExcursionPage'
import GuidesListPage, { GuidesByCountryPage } from '../pages/CatalogPages'
import LoginPage, { RegisterPage } from '../pages/AuthPages'
import AccountPage, { FavoritesPage, SettingsPage } from '../pages/AccountPages'
import {
  GuideOverviewPage,
  GuideProfilePage,
  GuideBillingPage,
  GuideDocumentsPage,
  GuideExcursionsPage,
  GuideCalendarPage,
} from '../pages/GuidePages'
import GuideLayout from '../components/crm/GuideLayout'
import CityPage, { MapPage } from '../pages/CityMapPages'
import CreateExcursionPage from '../pages/CreateExcursionPage'
import EditExcursionPage from '../pages/EditExcursionPage'
import AdminPage, { ModeratorPage } from '../pages/AdminPages'
import DeployPage from '../pages/DeployPage'
import { JournalListPage, JournalArticlePage } from '../pages/JournalPages'
import { RoleGate } from '../components/RoleGate'
import { GuideGate } from '../components/GuideGate'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="city/:slug" element={<CityPage />} />
        <Route path="guides" element={<GuidesListPage />} />
        <Route path="guides/:countrySlug" element={<GuidesByCountryPage />} />
        <Route path="guide/:slug" element={<GuidePage />} />
        <Route path="excursions" element={<Navigate to="/search" replace />} />
        <Route path="excursion/:slug" element={<ExcursionPage />} />
        <Route path="journal" element={<JournalListPage />} />
        <Route path="journal/:slug" element={<JournalArticlePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route element={<AccountLayout />}>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/favorites" element={<FavoritesPage />} />
        <Route path="/account/settings" element={<SettingsPage />} />
        <Route path="/account/guide" element={<GuideGate><GuideLayout /></GuideGate>}>
          <Route index element={<GuideOverviewPage />} />
          <Route path="profile" element={<GuideProfilePage />} />
          <Route path="billing" element={<GuideBillingPage />} />
          <Route path="documents" element={<GuideDocumentsPage />} />
          <Route path="excursions/new" element={<CreateExcursionPage />} />
          <Route path="excursions/:id/edit" element={<EditExcursionPage />} />
          <Route path="excursions" element={<GuideExcursionsPage />} />
          <Route path="calendar" element={<GuideCalendarPage />} />
        </Route>
        <Route path="/admin" element={<RoleGate role="ROLE_ADMIN"><AdminPage /></RoleGate>} />
        <Route path="/downloads" element={<RoleGate role="ROLE_ADMIN"><DeployPage /></RoleGate>} />
        <Route path="/deploy" element={<Navigate to="/downloads?app=web-prod-2026" replace />} />
        <Route path="/moderator" element={<RoleGate role="ROLE_MODERATOR"><ModeratorPage /></RoleGate>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
