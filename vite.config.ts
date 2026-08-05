import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
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
  test: {
    environment: 'node',
    css: true,
    include: ['src/**/*.test.{ts,tsx}']
  }
});
