import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas unitarias (npm test): Vitest + jsdom + React Testing Library
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: false,
    restoreMocks: true,
    // React solo expone act() en desarrollo; evita heredar NODE_ENV=production del sistema
    env: { NODE_ENV: 'test' },
  },
})
