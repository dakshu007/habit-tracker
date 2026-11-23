import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeCta from './src/lib/rehype-cta.mjs';

// Static site on Netlify. `format: 'file'` writes /ai-coach.html, which Netlify
// serves at /ai-coach (no trailing slash), so every URL has one canonical form.
export default defineConfig({
  site: 'https://habbittrackz.netlify.app',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Pin Vite to this folder's tsconfig; otherwise it can pick up the Expo app's tsconfig one level up.
  vite: { tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)) },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeCta] }),
  },
});
