import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Where the dev server proxies /api. Defaults to the local API; set
// VITE_DEV_API_PROXY to point a preview at a deployed backend.
const apiTarget = process.env.VITE_DEV_API_PROXY || 'http://localhost:4000'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    allowedHosts: ['.monkeycode-ai.live'],
  },
})
