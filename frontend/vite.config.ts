import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        '/logo/apple-touch-icon.png',
        '/logo/favicon-16x16.png',
        '/logo/favicon-32x32.png',
        '/logo/pwa-192x192.png',
        '/logo/pwa-512x512.png',
        '/logo/maskable-icon-192x192.png',
        '/logo/maskable-icon-512x512.png',
      ],
      manifest: {
        name: 'FlameFitness',
        short_name: 'FlameFitness',
        description: 'Планирование и отслеживание личных тренировок',
        theme_color: '#5A7000',
        background_color: '#26281E',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/logo/maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/logo/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['push-handlers.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && /\.(?:png|jpg|jpeg|svg|webp)$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-assets-v3',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'font' && /\.(?:woff|woff2)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-assets-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/App', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/Components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/Components/Pages', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/Styles', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/Assets', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/Utils', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@styles/variables.scss" as *;
          @use "@styles/mixins.scss" as *;
        `,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
