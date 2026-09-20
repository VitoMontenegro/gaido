import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import { DiscoverPublicLayout, DiscoverAccountLayout, DiscoverAdminLayout } from '@gaido/discover/layouts/DiscoverLayout'
import { discoverAccountRoutes, discoverPublicRoutes, discoverAdminRoutes } from '@gaido/discover/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<DiscoverPublicLayout />}>{discoverPublicRoutes()}</Route>
        <Route element={<DiscoverAccountLayout />}>{discoverAccountRoutes()}</Route>
        <Route element={<DiscoverAdminLayout />}>{discoverAdminRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
