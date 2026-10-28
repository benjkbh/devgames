import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bibliothèque de composants (`ui/`, alias `@ui`) et son catalogue. Projet
// autonome : `docker build .` dans ce dossier suffit. L'application
// (`frontend/`) importe la même `ui/` par le même alias. Le build est écrit
// dans `dist/`.
const ui = fileURLToPath(new URL('./ui', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@ui': ui },
  },
  server: {
    port: 6006,
  },
});
