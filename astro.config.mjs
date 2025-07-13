import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import mdx from '@astrojs/mdx'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'
import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    domains: ['github.com'],
    formats: ['avif', 'webp', 'png', 'jpg']
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.json',
      experimentalJsonConfig: true,
    },
  }),
  site: 'https://personal.emily-cogsdill.workers.dev',
  integrations: [mdx(), svelte()],
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'nord',
    },
    remarkPlugins: [remarkGfm, remarkSmartypants],
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
        },
      ],
    ],
  },
})
