'use client'

import { Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from '@gaido/ui-primitives/ScrollToTop'
import ImpersonationBanner from '@gaido/ui-primitives/ImpersonationBanner'
import { PortalPublicLayout, PortalAdminLayout } from '@gaido/portal-shell/layouts/PortalLayout'
import { portalAdminRoutes, portalPublicRoutes } from '@gaido/portal-shell/routes'

export default function PortalApp() {
  return (
    <>
      <ImpersonationBanner />
      <ScrollToTop />
      <Routes>
        <Route element={<PortalPublicLayout />}>{portalPublicRoutes()}</Route>
        <Route element={<PortalAdminLayout />}>{portalAdminRoutes()}</Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
