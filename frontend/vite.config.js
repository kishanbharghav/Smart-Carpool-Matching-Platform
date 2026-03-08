import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SRM Carpool',
        short_name: 'SRM Carpool',
        description: 'Campus rides · Live maps · Fair fuel split',
        theme_color: '#0d47a1',
        background_color: '#0a1929',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
