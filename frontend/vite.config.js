import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le build est écrit dans `frontend/dist/`.
// En développement, `npm run dev` relaie /api vers le backend (`BACKEND_URL`,
// par défaut http://127.0.0.1:8080).
//
// La bibliothèque de composants vit dans le projet du storybook
// (`storybook/ui`), importée par l'alias `@ui`. Ses fichiers importent React
// depuis leur dossier : `dedupe` le résout depuis ce projet, pour n'en charger
// qu'un.
const ui = fileURLToPath(new URL('../storybook/ui', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@ui': ui },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8080',
        changeOrigin: false,
      },
    },
  },
});
