# baba-is-win

Emily Cogsdill's personal website at [emilycogsdill.com](https://emilycogsdill.com) — a blog, micro-blog, project portfolio, and AI chat interface. Not recommended for anyone.

Built with Astro on Cloudflare Workers, with heavy and unapologetic assistance from AI agents.

## What it does

- **Home / Thoughts Wall** — Masonry layout of short-form micro-blog posts with tag filtering and image carousels
- **Blog** — Long-form posts with MDX, tags, thumbnails, and optional premium gating
- **Bio** — Biography with a difficulty selector (tutorial → maddening), each rendering a different version
- **Museum** — Project gallery showcasing GitHub projects, grouped into Applications / Tools / Nonsense
- **Chat** — AI chatbot backed by Cloudflare AutoRAG that answers questions about the site's content
- **Auth** — Email/password and Google OAuth login, with per-user email notification preferences

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 (SSR) |
| UI components | Svelte 5 |
| Content | MDX, remark-gfm |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| AI/RAG | Cloudflare AutoRAG |
| Auth | JWT (`jose`), bcrypt, Google OAuth |
| Email | Resend + Gmail API |
| Deployment | Cloudflare Workers (`wrangler`) |
| Admin CMS | Svelte 5 + Vite (builds to `public/admin/`) |
| Testing | Vitest (unit), Playwright (E2E) |

## Local Development

### Prerequisites

- Node.js 22+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Cloudflare account with D1, R2, and Workers AI enabled (for full local dev)

### Install

```bash
npm install
cd blog-admin && npm install && cd ..
```

### Run

```bash
# Full local dev with Cloudflare bindings (D1, R2, AI)
npm run dev

# Astro dev server only — no Cloudflare bindings, auth/DB won't work
npm run dev:astro
```

The full dev server runs via `wrangler dev` on port 4321. You'll need `wrangler.json` configured with your Cloudflare account's D1 database ID and R2 bucket name.

Apply migrations to initialize the local D1 database:

```bash
wrangler d1 migrations apply baba-is-win --local
```

### Build & Deploy

```bash
npm run build        # Build admin CMS + Astro
npm run deploy       # Build and deploy to Cloudflare Workers
```

## Tests

```bash
npm test                  # Unit tests (Vitest)
npm run test:coverage     # Unit tests with coverage
npm run test:e2e:setup    # Initialize test D1 database (run once)
npm run test:e2e          # End-to-end tests (Playwright)
```

## Original Template

Started from the [Astro Framework Starter](https://github.com/cloudflare/templates/tree/main/packages/astro) template for Cloudflare Workers.
