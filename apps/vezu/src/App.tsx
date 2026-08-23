import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import { TransportPublicLayout } from '@gaido/transport/layouts/TransportLayout'
import { TransportAccountLayout } from '@gaido/transport/layouts/TransportAccountLayout'
import { TransportAdminLayout } from '@gaido/transport/layouts/TransportAdminLayout'
import { transportPublicRoutes, transportAccountRoutes, transportAdminRoutes } from '@gaido/transport/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<TransportPublicLayout />}>{transportPublicRoutes()}</Route>
        <Route element={<TransportAccountLayout />}>{transportAccountRoutes()}</Route>
        <Route element={<TransportAdminLayout />}>{transportAdminRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
