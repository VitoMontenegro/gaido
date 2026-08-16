import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import { DiscoverPublicLayout, DiscoverAccountLayout } from '@gaido/discover/layouts/DiscoverLayout'
import { discoverAccountRoutes, discoverPublicRoutes } from '@gaido/discover/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<DiscoverPublicLayout />}>{discoverPublicRoutes()}</Route>
        <Route element={<DiscoverAccountLayout />}>{discoverAccountRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
