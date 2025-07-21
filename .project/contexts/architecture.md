# System Architecture

## Overview

Baba Is Win follows a modern JAMstack architecture with edge computing capabilities, combining static site generation with dynamic serverless functions for a fast, scalable personal website.

## Architecture Principles

### 1. Edge-First Design
- Content served from global edge locations
- Database queries executed at the edge
- Minimal latency for worldwide visitors

### 2. Hybrid Rendering Strategy
- Static generation for blog posts and content pages
- Dynamic rendering for authenticated routes
- API endpoints for interactive features

### 3. Security by Design
- JWT-based authentication with HTTP-only cookies
- Input validation at every layer
- Rate limiting on sensitive endpoints
- Parameterized database queries

## Core Components

### Frontend Layer
**Technology:** Astro + Svelte
- **Static Site Generation:** Pre-built HTML for blog posts, thoughts, and portfolio
- **Interactive Islands:** Svelte components for dynamic UI elements
- **Asset Pipeline:** Optimized images, fonts, and CSS delivery
- **Progressive Enhancement:** Works without JavaScript, enhanced with it

### Application Layer
**Technology:** Cloudflare Worker (single worker: 'personal')
- **API Routes:** RESTful endpoints under `/api/`
- **Authentication:** JWT session management
- **Email Service:** Gmail API integration for notifications
- **Middleware:** Request validation, CORS, rate limiting

### Data Layer
**Technology:** Cloudflare D1 (SQLite at the edge)
- **Single Database:** 'baba-is-win-db' for all application data
- **Schema Management:** Version-controlled migrations
- **Query Patterns:** Optimized for edge execution
- **Data Models:** Users, content, emails, preferences

### External Integrations
- **Gmail API:** Transactional email delivery
- **GitHub API:** Portfolio project data
- **Google OAuth:** Social authentication (in progress)

## Request Flow Architecture

```
User Request → Cloudflare Edge → Route Handler
                                      ↓
                              [Static Asset?] → Serve from Cache
                                      ↓
                              [API Request?] → Worker Function
                                      ↓              ↓
                                  Auth Check    Business Logic
                                      ↓              ↓
                                  D1 Database   External APIs
                                      ↓              ↓
                                  Response ← Transform Data
```

## Security Architecture

### Authentication Flow
1. User provides credentials
2. Worker validates and generates JWT
3. JWT stored in HTTP-only cookie
4. Subsequent requests include cookie
5. Worker validates JWT on each request

### Data Protection
- **At Rest:** D1 encryption by Cloudflare
- **In Transit:** HTTPS everywhere
- **Access Control:** Row-level security via application logic
- **Secrets Management:** Wrangler secrets for sensitive data

## Performance Architecture

### Caching Strategy
1. **Static Assets:** Long-term browser caching with versioned URLs
2. **API Responses:** Short-term edge caching for public data
3. **Database Queries:** Connection pooling and query optimization
4. **Image Optimization:** Responsive images with lazy loading

### Optimization Techniques
- **Code Splitting:** Per-route JavaScript bundles
- **Critical CSS:** Inline above-the-fold styles
- **Font Loading:** Preload with font-display: swap
- **Compression:** Brotli/gzip for all text assets

## Deployment Architecture

### Continuous Deployment
- **Trigger:** Push to main branch
- **Build:** GitHub Actions runs build process
- **Deploy:** Automatic deployment to Cloudflare
- **Rollback:** Previous deployments retained

### Environment Management
- **Development:** Local with wrangler dev
- **Preview:** Branch deployments for testing
- **Production:** Main branch auto-deploys

## Scalability Considerations

### Current Scale
- Single worker handles all traffic efficiently
- D1 database suitable for current load
- No performance bottlenecks identified

### Future Scale Options
- **Worker Scaling:** Automatic via Cloudflare
- **Database Sharding:** D1 supports read replicas
- **Cache Layer:** Consider Redis for session storage
- **CDN Assets:** Already leveraging Cloudflare CDN

## Monitoring & Observability

### Available Metrics
- **Worker Analytics:** Request counts, errors, latency
- **D1 Metrics:** Query performance, storage usage
- **Real User Monitoring:** Core Web Vitals tracking
- **Error Tracking:** Worker tail logs and exceptions

### Health Checks
- Database connectivity monitoring
- External API availability checks
- Performance budget tracking
- Security audit logging

## Architectural Decisions

### Why Cloudflare Workers?
- Global edge deployment without managing servers
- Excellent cold start performance
- Integrated ecosystem (D1, R2, etc.)
- Cost-effective for personal projects

### Why Astro?
- Perfect for content-heavy sites
- Flexible rendering modes
- Minimal JavaScript by default
- Great developer experience

### Why Single Worker?
- Simplicity over premature optimization
- Easier deployment and debugging
- Sufficient for current traffic
- Can split later if needed

### Why D1 Database?
- SQLite familiarity with edge benefits
- No separate database server needed
- Automatic replication
- Good enough performance for use case

## Future Architecture Considerations

### Potential Enhancements
1. **Service Worker:** Offline support for content
2. **Web Push:** Real-time notifications
3. **GraphQL Layer:** More flexible data fetching
4. **Event Sourcing:** Better audit trails

### Technical Debt
- OAuth implementation incomplete
- Test coverage needs improvement
- Some components need refactoring
- Documentation gaps in some areas

---

*This architecture provides a solid foundation for a personal website while remaining simple enough to maintain as a solo developer. The focus is on leveraging platform capabilities rather than building complex custom solutions.*