import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Use the repo subpath only for production (gh-pages); dev server uses '/'
  base: process.env.NODE_ENV === 'production' ? '/realeye-tol-final-project/' : '/',
  plugins: [react()],
})
