import { resolve } from 'path'
import { createAppViteConfig } from '../../packages/build-config/vite.app.ts'

export default createAppViteConfig({
  appDir: resolve(import.meta.dirname),
  defaultPort: 5175,
  siteMode: 'services',
  verticalPackage: 'discover',
  leaflet: true,
})
