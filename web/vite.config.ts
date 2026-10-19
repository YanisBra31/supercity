import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// L'appli web est servie sous supercity.fr/app, à côté de l'API (supercity.fr/api).
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: { port: 5173 },
  // dist/app : le dossier à déposer tel quel dans public_html.
  build: { outDir: 'dist/app' },
});
