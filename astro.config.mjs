import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { site } from './src/site.config.mjs';

export default defineConfig({
  site: site.url,
  integrations: [sitemap()],
  markdown: {
    // Code blocks: light and dark syntax themes.
    // Full list at https://shiki.style/themes
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
    // LaTeX maths: $inline$ and $$display$$.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
