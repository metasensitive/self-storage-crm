import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Используется и в dev (server.proxy), и в preview (preview.proxy).
// Явный loopback `127.0.0.1` вместо `localhost`, чтобы не маршрутизироваться
// через VPN-туннель.
const PROXY_CONFIG = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/storage': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // Слушаем на всех интерфейсах (0.0.0.0). Полезно при включённом VPN —
    // некоторые VPN-клиенты перехватывают DNS-имя `localhost`, тогда как
    // адрес loopback `127.0.0.1` остаётся доступен напрямую.
    host: true,
    port: 5173,
    strictPort: true,
    proxy: PROXY_CONFIG,
  },
  // `npm run preview` запускает статический сервер для dist/ — у него
  // отдельный конфиг, но мы хотим то же самое поведение, что и в dev.
  // Без этого preview не проксирует /api на бэк, и axios получает Network Error.
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    proxy: PROXY_CONFIG,
  },
});
