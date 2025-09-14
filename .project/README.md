# Baba Is Win - Project Documentation

## DEPLOYMENT: CLOUDFLARE WORKERS (NOT PAGES!)
**CRITICAL**: This project deploys to **Cloudflare Workers**, NOT Cloudflare Pages. 
- Production URL: `https://personal.emily-cogsdill.workers.dev`
- Deployment command: `npm run deploy` (uses `wrangler deploy`, NOT `wrangler pages`)
- Configuration: `wrangler.json` (Workers config, NOT Pages config)

## For AI Assistants
**MANDATORY**: Read ALL files in `.project/` before starting work, especially:
1. `guidelines/ai-behavior.md` - Critical behavioral rules
2. `requirements/overview.md` - What we're building
3. `requirements/technical.md` - How we're building it
4. `guidelines/tdd-approach.md` - Testing philosophy
5. `guidelines/troubleshooting.md` - Common issues

## For Humans
- Requirements: See `requirements/overview.md`  
- Tech Stack: See `requirements/technical.md`
- Common Issues: See `guidelines/troubleshooting.md`

## Project Overview
Baba Is Win is a personal website and thoughts platform built with Astro and deployed on **Cloudflare Workers** (NOT Cloudflare Pages). It features user authentication, a content management system for thoughts/posts, and a museum of web experiments.

## Key Commands
```bash
# Development
npm run dev           # Start dev server on localhost:4321

# Testing
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Build/Deploy
npm run build         # Build for production
npm run deploy        # Deploy to Cloudflare Workers
```

## Architecture (CLOUDFLARE WORKERS)
```
Frontend (Astro/Svelte) → API Routes → Services → D1 Database
                       ↓              ↓
                   Middleware    Email Service
                                (Resend)
```
- **Framework**: Astro with Svelte components for interactivity
- **Runtime**: **Cloudflare Workers** (NOT Pages!) - edge computing
- **Database**: Cloudflare D1 (SQLite) named 'baba-is-win-db'
- **Authentication**: JWT-based with Google OAuth integration
- **Email**: Resend for transactional emails
- **Deployment**: Via `wrangler deploy` to Workers, NOT Pages

## Performance Targets
- **Core Web Vitals**: 
  - LCP < 2.5s
  - FID < 100ms  
  - CLS < 0.1
- **Bundle Size**: < 500KB initial, < 2MB total
- **API Response**: < 200ms for critical endpoints

## Security Considerations
- JWT tokens for authentication (never expose JWT_SECRET)
- Environment variables for all secrets (use .dev.vars locally)
- Input validation on all API endpoints
- CSRF protection on state-changing operations
- Rate limiting on auth endpoints