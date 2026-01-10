# baba-is-win

Personal blog and portfolio site with Baba Is You-inspired aesthetic. Features blog posts, "thoughts" (short-form content), project museum, and user authentication.

## Tech Stack

- **Framework**: Astro 5 with SSR (`output: 'server'`)
- **UI**: Astro components + Svelte for interactive widgets
- **Styling**: CSS (no framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 for images
- **Hosting**: Cloudflare Workers
- **Auth**: Custom JWT-based auth with optional Google OAuth
- **Email**: Resend (notification system for subscribers)
- **Testing**: Vitest (unit), Playwright (e2e)

## Project Structure

```
src/
  components/     # Astro + Svelte components
  data/           # Content and configuration
    blog-posts/   # Markdown blog posts (published/, draft/)
    thoughts/     # Short-form posts (published/, draft/)
    museum-config.json  # Project showcase config
  layouts/        # Page layouts (BaseLayout.astro)
  lib/            # Core business logic
    auth/         # JWT, password hashing, user management
    db/           # D1 database queries
    email/        # Notification system, templates
    oauth/        # Google OAuth integration
  pages/          # Astro routes
    api/          # REST endpoints
      admin/      # Protected admin endpoints
      auth/       # Login, signup, OAuth
      cron/       # Scheduled notification jobs
      user/       # User preferences
  middleware.ts   # Auth middleware
migrations/       # D1 SQL migrations (numbered)
blog-admin/       # Separate Svelte/Capacitor mobile admin app
```

## Key Commands

```bash
# Development
make dev          # Build + wrangler dev with remote D1 (recommended)
make astro        # Astro dev server with hot reload (local DB)

# Testing
npm test          # Run vitest
npm run test:coverage  # Coverage report

# Deployment
npm run deploy    # Build + deploy to Cloudflare Workers
npm run check     # Build + type check + dry-run deploy

# Database
npx wrangler d1 migrations apply baba-is-win-db --remote  # Apply migrations
npx wrangler d1 execute baba-is-win-db --remote --command "SELECT * FROM users"

# Museum screenshots
npm run museum:screenshots       # Update all project screenshots
npm run museum:screenshots:force # Force refresh all
```

## Development Workflow

1. **Local dev**: `make dev` starts wrangler with remote D1 on port 4321
2. **Content**: Add `.md` files to `src/data/blog-posts/published/` or `src/data/thoughts/published/`
3. **Database changes**: Create numbered migration in `migrations/`, apply with wrangler CLI
4. **Deploy**: Push to main triggers Cloudflare auto-deploy; `deploy-and-notify.yml` sends emails for new content

## Environment Variables

Required in production (set via `wrangler secret put`):
- `JWT_SECRET` - Session signing
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `RESEND_API_KEY` - Email notifications
- `CRON_SECRET` - Cron endpoint auth

D1 binding: `DB` (configured in wrangler.json)
R2 binding: `IMAGES`

## Code Patterns

- **API routes**: Export HTTP method handlers (`export async function POST()`)
- **Auth**: `context.locals.user` available after middleware (may be undefined)
- **Protected routes**: Defined in middleware.ts - add new ones there
- **Content**: Frontmatter in markdown files, processed by Astro glob imports

## Testing

- Unit tests in `src/__tests__/` and `src/lib/**/__tests__/`
- Coverage thresholds: 80% branches, 85% functions/lines
- Run `npm test` before committing

## CI/CD

GitHub Actions workflows:
- `deploy-and-notify.yml` - Waits for auto-deploy, triggers email notifications
- `sync-content.yml` - Content synchronization
- `upload-to-r2.yml` - Image upload to R2

Note: Cloudflare auto-deploys on push to main. Workflows don't run `wrangler deploy`.
