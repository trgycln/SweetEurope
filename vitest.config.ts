import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Sadece __tests__ ve src/**/__tests__ klasörlerini tara.
    // e2e/ ve tests/e2e/ Playwright spec dosyaları hariç.
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'tests/e2e/**', 'node_modules/**'],
  }
})
