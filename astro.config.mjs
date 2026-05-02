// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.yuuniworks.com',
  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});