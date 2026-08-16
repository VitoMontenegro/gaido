import { Navigate, Route, Routes } from 'react-router-dom'
import { lazyImport } from '@gaido/shared/lib/lazyImport'
import { PublicLayout, AccountLayout } from '@gaido/shared/layouts/MainLayout'
import ScrollToTop from '@gaido/shared/components/ScrollToTop'
import { Lazy, guidesCrossLinks, touristAccountRoutes } from '@gaido/shared/app/routes'
import { DiscoverPage, ProviderPage, ProviderAccountPage } from '@gaido/discover-ui'

const LoginPage = lazyImport(() => import('@gaido/shared/pages/AuthPages').then((m) => ({ default: m.default })))
const RegisterTouristPage = lazyImport(() =>
  import('@gaido/shared/pages/AuthPages').then((m) => ({ default: m.RegisterTouristPage })),
)
const LegalDocumentPage = lazyImport(() =>
  import('@gaido/shared/components/LegalContentEditor').then((m) => ({ default: m.LegalDocumentPage })),
)

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Lazy><DiscoverPage /></Lazy>} />
          <Route path="discover" element={<Navigate to="/" replace />} />
          <Route path="provider/:slug" element={<Lazy><ProviderPage /></Lazy>} />
          <Route path="login" element={<Lazy><LoginPage /></Lazy>} />
          <Route path="register" element={<Lazy><RegisterTouristPage /></Lazy>} />
          <Route path="legal/:slug" element={<Lazy><LegalDocumentPage /></Lazy>} />
          {guidesCrossLinks()}
        </Route>
        <Route element={<AccountLayout />}>
          {touristAccountRoutes()}
          <Route path="/account/provider" element={<Lazy><ProviderAccountPage /></Lazy>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
