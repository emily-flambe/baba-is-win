# Technology Stack

## DEPLOYMENT: CLOUDFLARE WORKERS (NOT PAGES!)
**CRITICAL**: This project uses **Cloudflare Workers**, NOT Cloudflare Pages.
- Deployment: `wrangler deploy` (NOT `wrangler pages deploy`)
- Production URL: `https://personal.emily-cogsdill.workers.dev`
- Config file: `wrangler.json` (Workers configuration)

## Core Technologies
- **Language**: TypeScript 5.0+
- **Framework**: Astro 4.0+ (Static Site Generator with Islands Architecture)
- **Runtime**: **Cloudflare Workers** (Edge Computing) - NOT Pages!
- **Database**: Cloudflare D1 (SQLite-based, named 'baba-is-win-db')
- **Hosting**: Cloudflare Workers ONLY (NOT Pages)

## Key Dependencies
- **astro**: Core framework for static site generation
- **@astrojs/svelte**: Svelte integration for interactive components
- **@astrojs/cloudflare**: Cloudflare adapter for deployment
- **drizzle-orm**: Type-safe ORM for database operations
- **jsonwebtoken**: JWT token generation and validation
- **resend**: Email service for notifications
- **sharp**: Image optimization and processing
- **playwright**: E2E testing and screenshot capture

## Development Setup

### Prerequisites
- Node.js version 20 or higher
- npm (comes with Node.js)
- Cloudflare account with Workers and D1 access
- Git for version control

### Environment Variables
```env
# Required for Local Development (.dev.vars)
JWT_SECRET=32+ character secret for JWT signing
API_KEY_SALT=Salt for API key hashing
CRON_SECRET=Secret for cron job authentication

# OAuth Configuration
GOOGLE_CLIENT_ID=Google OAuth client ID
GOOGLE_CLIENT_SECRET=Google OAuth client secret
GOOGLE_REDIRECT_URI=OAuth callback URL

# Email Service
RESEND_API_KEY=Resend API key
RESEND_FROM_EMAIL=Verified sender email

# Optional
PUBLIC_POSTHOG_KEY=PostHog analytics key
PUBLIC_POSTHOG_HOST=PostHog host URL
```

### Commands
```bash
# Install
npm install

# Development
npm run dev              # Start dev server on localhost:4321

# Test
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Build
npm run build           # Build for production
npm run preview        # Preview production build

# Deploy
npm run deploy          # Deploy to Cloudflare Workers (NOT Pages!)
```

## Code Patterns

### API Route Pattern
```typescript
// Standard API response structure
import type { APIContext } from 'astro';
import { json } from '@/lib/response';

export async function POST({ request, locals }: APIContext) {
  try {
    const data = await request.json();
    
    // Validation
    if (!isValid(data)) {
      return json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    
    // Business logic
    const result = await processRequest(data);
    
    // Success response
    return json({ success: true, data: result });
  } catch (error) {
    // Error response
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
```

### Database Query Pattern
```typescript
// Using Drizzle ORM with D1
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserById(id: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return result[0] || null;
}
```

## Architecture Decisions

### Astro with Islands Architecture
**Context**: Need for mostly static site with selective interactivity
**Decision**: Use Astro with Svelte components for interactive islands
**Rationale**: Optimal performance with minimal JavaScript shipped to client
**Trade-offs**: Learning curve for island architecture pattern

### Cloudflare Workers + D1 (NOT Pages!)
**Context**: Need for serverless, globally distributed hosting
**Decision**: Use Cloudflare Workers (NOT Pages) with D1 database
**Rationale**: Edge computing for low latency, integrated ecosystem
**Trade-offs**: SQLite limitations, Cloudflare vendor lock-in
**Important**: Workers deployment via `wrangler deploy`, NOT Pages

### JWT Authentication
**Context**: Need for stateless authentication
**Decision**: JWT tokens with secure httpOnly cookies
**Rationale**: Scalable, works well with edge computing
**Trade-offs**: Token size, revocation complexity

### Resend for Email
**Context**: Need reliable transactional email service
**Decision**: Use Resend for email notifications
**Rationale**: Developer-friendly API, good deliverability
**Trade-offs**: External dependency, potential costs at scale

## Performance Considerations
- Static generation for most pages
- Lazy loading for images and non-critical components
- Edge caching with Cloudflare CDN
- Bundle splitting and code optimization
- Image optimization with Sharp
- Minimal client-side JavaScript

## Security Practices
- JWT tokens stored in httpOnly cookies
- Environment variables for all secrets
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- Rate limiting on authentication endpoints
- CSRF protection using tokens
- Content Security Policy headers

## Testing Strategy
- Unit tests: Vitest for business logic
- Integration tests: API endpoint testing
- E2E tests: Playwright for critical user flows
- Database tests: In-memory SQLite for D1
- Coverage target: 70% minimum

## Database Schema Management
- Migrations in `/migrations/` directory
- Sequential numbering (0001_init.sql, 0002_feature.sql)
- Apply locally: `wrangler d1 migrations apply baba-is-win-db --local`
- Apply production: `wrangler d1 migrations apply baba-is-win-db`

## API Design
- RESTful endpoints under `/api/v1/`
- Consistent response format
- Proper HTTP status codes
- JWT authentication via middleware
- Rate limiting on sensitive endpoints

## Common Gotchas
- D1 database has SQLite limitations (no arrays, limited JSON support)
- Workers have CPU time limits (50ms for free tier)
- Environment variables must be in `.dev.vars` for local development
- Cloudflare-specific APIs differ from Node.js
- Build output must be under 25MB for Workers
- WebSocket support limited in Workers