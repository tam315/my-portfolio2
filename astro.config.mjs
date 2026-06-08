// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.yuuniworks.com',
  integrations: [react(), sitemap()],

  markdown: {
    shikiConfig: {
      themes: {
        light: 'catppuccin-latte',
        dark: 'catppuccin-mocha'
      },
      defaultColor: false
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        { target: '_blank', rel: ['noopener', 'noreferrer'] }
      ]
    ]
  },

  image: {
    layout: 'constrained',
    responsiveStyles: true
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
