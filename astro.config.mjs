import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://julkee-x-lempee-hakemus.vercel.app',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
