import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appConfig } from './src/app/appConfig';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  // Real consultation is the safe default. A demo must always be selected
  // deliberately; otherwise valid credentials could appear to return a
  // fabricated timetable.
  const apiMode = env.VITE_ACADEMIC_API_MODE || 'http';
  if (!['mock', 'http'].includes(apiMode)) {
    throw new Error('VITE_ACADEMIC_API_MODE debe ser mock o http.');
  }
  const upstream = env.API_PROXY_TARGET || (apiMode === 'http' && mode !== 'production' ? 'http://127.0.0.1:8000' : undefined);
  if (upstream && !/^https?:\/\//.test(upstream)) {
    throw new Error('API_PROXY_TARGET debe ser un origen HTTP o HTTPS.');
  }
  return {
  server: {
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
    ...(upstream ? { proxy: { '/api': { target: upstream.replace(/\/$/, ''), changeOrigin: true, rewrite: (path: string) => path.replace(/^\/api(?=\/|$)/, '') } } } : {}),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: appConfig.name,
        short_name: appConfig.shortName,
        description: appConfig.description,
        lang: 'es',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: appConfig.themeColor,
        background_color: appConfig.backgroundColor,
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    env: { VITE_ACADEMIC_API_MODE: 'mock' },
    clearMocks: true,
    restoreMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
};
});
