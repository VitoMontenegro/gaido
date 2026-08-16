import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AccountLayout } from '@gaido/shared/layouts/MainLayout'
import ScrollToTop from '@gaido/shared/components/ScrollToTop'
import { portalAdminRoutes, portalPublicRoutes } from '@gaido/shared/app/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>{portalPublicRoutes()}</Route>
        <Route element={<AccountLayout />}>{portalAdminRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
