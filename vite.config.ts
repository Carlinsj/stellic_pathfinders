import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const resetDevelopmentServiceWorker = (): Plugin => ({
  name: 'campusfit-development-service-worker-reset',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if ((request.url ?? '').split('?')[0] !== '/sw.js') return next();

      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.setHeader('Service-Worker-Allowed', '/');
      response.end(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => /workbox|campusfit/i.test(name))
      .map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});
`);
    });
  },
});

export default defineConfig({
  plugins: [
    resetDevelopmentServiceWorker(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CampusFit',
        short_name: 'CampusFit',
        description: 'Know where and when to work out on campus.',
        theme_color: '#57068c',
        background_color: '#f3f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    css: true,
    include: ['src/**/*.test.{ts,tsx}']
  }
});
