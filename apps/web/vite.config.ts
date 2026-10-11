import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'trip-polama',
        short_name: 'trip-polama',
        description: 'Offline-first, split-brain outdoor trip manager.',
        theme_color: '#16a34a',
        background_color: '#f2f7fb',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8787' } },
});
