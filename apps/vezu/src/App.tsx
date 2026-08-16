import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import { TransportPublicLayout } from '@gaido/transport/layouts/TransportLayout'
import { transportPublicRoutes } from '@gaido/transport/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<TransportPublicLayout />}>{transportPublicRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
