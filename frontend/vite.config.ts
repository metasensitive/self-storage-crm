import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

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
    proxy: {
      // Используем явный loopback `127.0.0.1` вместо имени `localhost`
      // по той же причине — чтобы не маршрутизироваться через VPN-туннель.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
