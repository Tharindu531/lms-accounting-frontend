import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    // Installable app. The service worker precaches the app's own files only (never
    // API responses), and a new version waits for the student to tap "Reload"
    // instead of reloading on its own, which could interrupt a quiz.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['theme-init.js'],
      manifest: {
        name: 'Accounting with Indika Amarakoon',
        short_name: 'Accounting',
        description: 'A/L Accounting lessons, quizzes and results.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f7fb',
        theme_color: '#1d3a8f',
        lang: 'en',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg}'],
        // Only the font subsets this app uses (Latin and Sinhala); others load on demand if ever needed.
        globIgnores: ['**/*-cyrillic-*', '**/*-greek-*', '**/*-vietnamese-*', '**/noto-sans-sinhala-latin*', '**/*-hero-*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // YouTube thumbnails: show cached ones offline, refresh in the background.
            urlPattern: ({ url }) => url.hostname === 'i.ytimg.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'thumbnails', expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // React rarely changes, so it gets its own long-cached file: a deploy of the
        // app then only re-downloads the app's own code.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
