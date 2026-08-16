import { resolve } from 'path'
import { createAppViteConfig } from '../../packages/shared/vite.base.ts'

export default createAppViteConfig({
  appDir: resolve(import.meta.dirname),
  defaultPort: 5173,
  siteMode: 'portal',
})
