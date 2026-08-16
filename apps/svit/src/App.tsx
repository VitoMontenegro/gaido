import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout, AccountLayout } from '@gaido/shared/layouts/MainLayout'
import ScrollToTop from '@gaido/shared/components/ScrollToTop'
import { guideAccountRoutes, svitPublicRoutes } from '@gaido/shared/app/routes'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>{svitPublicRoutes()}</Route>
        <Route element={<AccountLayout />}>{guideAccountRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
