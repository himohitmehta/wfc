import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In dev, send /api to FastAPI so both look like one site (no CORS needed).
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
