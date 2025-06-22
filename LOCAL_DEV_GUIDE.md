# Local Development Guide

## Development with Cloudflare D1 and Workers

Since this project uses Cloudflare D1 database and other Cloudflare bindings, you need to use Wrangler for local development to properly simulate the Cloudflare Workers environment.

### Available Scripts

- **`npm run dev`** - Primary development command (uses Wrangler)
  - Builds the project and starts Wrangler dev server
  - Includes D1 database binding
  - Runs on http://localhost:8787
  - **Use this for all development with authentication**

- **`npm run dev:astro`** - Astro-only development (no D1)
  - Use only for UI development without database features
  - Runs on http://localhost:4321
  - Authentication features won't work

- **`npm run build`** - Build for production
- **`npm run deploy`** - Build and deploy to Cloudflare
- **`npm run preview`** - Preview production build locally

### Typical Development Workflow

1. **For full-stack development with authentication:**
   ```bash
   npm run dev
   ```
   Then visit http://localhost:8787

2. **For UI-only development:**
   ```bash
   npm run dev:astro
   ```
   Then visit http://localhost:4321

### Important Notes

- The regular `astro dev` command doesn't support Cloudflare bindings (D1, KV, etc.)
- Always use `npm run dev` when working with authentication or database features
- The build step is required before Wrangler can serve your files
- Port 8787 is the default for Wrangler dev server

### Database Commands

```bash
# List all D1 databases
npx wrangler d1 list

# Execute SQL on local database
npx wrangler d1 execute baba-is-win-db --local --command="SELECT * FROM users"

# Execute SQL on remote database
npx wrangler d1 execute baba-is-win-db --remote --command="SELECT * FROM users"

# Apply migrations
npx wrangler d1 migrations apply baba-is-win-db --local
npx wrangler d1 migrations apply baba-is-win-db --remote
```