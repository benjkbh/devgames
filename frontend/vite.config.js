import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le build est écrit dans `frontend/dist/`.
// En développement, `npm run dev` relaie /api vers le backend (`BACKEND_URL`,
// par défaut http://127.0.0.1:8080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8080',
        changeOrigin: false,
      },
    },
  },
});
