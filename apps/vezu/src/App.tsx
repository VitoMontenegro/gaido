import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@gaido/shared/layouts/MainLayout'
import ScrollToTop from '@gaido/shared/components/ScrollToTop'
import { vezuPublicRoutes } from '@gaido/shared/app/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>{vezuPublicRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
