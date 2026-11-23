// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH lets the builder host the site under a sub-path, e.g. BASE_PATH=/kiot/
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', assets: 'assets' },
  server: { host: '0.0.0.0', port: 4321 },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
