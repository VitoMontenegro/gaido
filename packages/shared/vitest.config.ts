import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@gaido/shared': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
  },
})
