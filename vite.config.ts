import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths for built assets so the dashboard works whether it's
  // served from the root (`/`) or from a sub-path like a GitHub Pages repo
  // URL (`/<repo-name>/`). Avoids hard-coding the repo name here.
  base: './',
})
