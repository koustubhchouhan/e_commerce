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
  build: {
    rollupOptions: {
      output: {
        // Keep the framework runtime and the (large, rarely-changing) Supabase
        // client in their own long-lived chunks, so shipping app code does not
        // invalidate them in returning visitors' caches. Supabase stays lazily
        // loaded: its vendor chunk is only fetched when googleAuth imports it.
        // (Vite 8 / rolldown requires the function form of manualChunks.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
})
