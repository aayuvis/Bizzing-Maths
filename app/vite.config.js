import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/* The service worker is not an app module — it must land at the build root
   unhashed, or its scope is wrong. One inline plugin beats a dependency.

   The manifest and the icon have exactly the same problem and it bit Bizzing Finance: Vite
   treated them as assets, hashed them and moved them into assets/, so their
   own relative fields resolved against THAT directory. On a project page at
   /bizzingfinance/ the manifest's start_url pointed at
   /bizzingfinance/assets/index.html and its icon at
   /bizzingfinance/assets/icon.svg — both 404. The app was fine; installing it
   to a home screen launched a dead page with no icon, and nothing in a
   root-served dev build could show you that. They now live in public/, which
   Vite copies verbatim to the build root and never rewrites. */
function copySW() {
  return {
    name: 'copy-sw',
    closeBundle() {
      const src = resolve(__dirname, 'sw.js');
      if (existsSync(src)) copyFileSync(src, resolve(__dirname, 'build/sw.js'));
    },
  };
}

export default defineConfig({
  /* Relative base so a build drops onto any static host — GitHub Pages, a CDN
     path, or a folder someone opens through a local server. */
  base: './',
  plugins: [copySW()],
  build: { outDir: 'build', emptyOutDir: true, target: 'es2020' },
  server: { port: 8080, open: false },
});
