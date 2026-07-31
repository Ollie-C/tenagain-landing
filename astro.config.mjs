import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://myvu.app',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Barlow',
      cssVariable: '--font-barlow',
      weights: [400, 600, 700],
      styles: ['normal'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Rajdhani',
      cssVariable: '--font-rajdhani',
      weights: [600, 700],
      styles: ['normal', 'italic'],
      fallbacks: ['sans-serif'],
    },
  ],
});
