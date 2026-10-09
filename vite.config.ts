import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Cabeceras de seguridad aplicadas al servidor de desarrollo y a `vite preview`.
 * En producción deben configurarse en el CDN / servidor que sirva `dist/`.
 */
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * La CSP estricta solo se aplica en `preview`: el servidor de desarrollo de Vite
 * inyecta scripts inline (React Refresh) que una CSP sin `unsafe-inline` bloquearía.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://picsum.photos https://fastly.picsum.photos",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Backend local (`npm run dev:api`). El navegador solo habla con el origen de Vite: las cookies son same-site. */
const apiProxy = {
  '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false },
} as const;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    headers: securityHeaders,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
    headers: { ...securityHeaders, 'Content-Security-Policy': contentSecurityPolicy },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Separa las dependencias estables para aprovechar la caché del navegador.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('zod')) return 'vendor-zod';
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
