import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import { GuidesPublicLayout, GuidesAccountLayout, GuidesAdminLayout } from '@gaido/guides/layouts/GuidesLayout'
import { guideAccountRoutes, svitAdminRoutes, svitPublicRoutes } from '@gaido/guides/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<GuidesPublicLayout />}>{svitPublicRoutes()}</Route>
        <Route element={<GuidesAccountLayout />}>{guideAccountRoutes()}</Route>
        <Route element={<GuidesAdminLayout />}>{svitAdminRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
