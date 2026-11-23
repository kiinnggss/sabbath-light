import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = env.GITHUB_PAGES === 'true' ? '/sabbath-light/' : '/';

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'data/hymnal.json'],
        manifest: {
          name: 'Sabbath Light - SDA Worship & Study',
          short_name: 'Sabbath Light',
          description:
            'Offline-ready Seventh-day Adventist Hymnal (1-920), Sabbath School Quarterly, and Multi-Version Bible study companion.',
          theme_color: '#B64F1B',
          background_color: '#F7F5F0',
          display: 'standalone',
          start_url: base,
          scope: base,
          orientation: 'portrait-primary',
          icons: [
            {
              src: `${base}icons/icon-192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}icons/icon-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: `${base}icons/icon.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mjs}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/sabbath-school\.adventech\.io\/api\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'ss-api-cache',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/sabbath-school-pdf\.adventech\.io\/pdf\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ss-pdf-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/bolls\.life\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'bible-bolls-cache',
                expiration: {
                  maxEntries: 350,
                  maxAgeSeconds: 60 * 60 * 24 * 60,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/bible\.helloao\.org\/api\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'bible-helloao-cache',
                expiration: {
                  maxEntries: 350,
                  maxAgeSeconds: 60 * 60 * 24 * 60,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
