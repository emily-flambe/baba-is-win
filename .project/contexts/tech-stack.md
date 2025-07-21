# Technology Stack

## Frontend Framework
- **Astro 5.11.0**: Static site generator with hybrid rendering
- **Svelte**: Component framework for interactive elements
- **MDX**: Enhanced markdown with component embedding

## Runtime & Deployment
- **Cloudflare Workers**: Serverless edge computing platform
- **Cloudflare D1**: Distributed SQLite database
- **Cloudflare Assets**: Static asset hosting and optimization
- **Wrangler**: CLI for Cloudflare Workers deployment

## Languages & Tools
- **TypeScript 5.7.2**: Primary development language
- **JavaScript**: Build scripts and utilities
- **CSS**: Custom styling with CSS variables
- **SQL**: Database queries and migrations

## Development Tools
- **Vite**: Build tool and development server
- **Vitest**: Testing framework with coverage
- **Sharp**: Image processing and optimization
- **ESLint/Prettier**: Code formatting and linting

## Authentication & Security
- **JWT (JOSE)**: JSON Web Tokens for session management
- **bcrypt**: Password hashing
- **Google OAuth**: Social authentication integration
- **Rate Limiting**: API protection

## External Services
- **Google APIs**: Gmail integration for notifications
- **GitHub API**: Repository data for museum section

## Database Schema
- **Users**: Authentication and profiles
- **Email Preferences**: Notification settings
- **Email History**: Delivery tracking
- **Content Tracking**: Blog/thought management

## Build & CI/CD
- **npm**: Package management
- **GitHub Actions**: Automated testing and deployment
- **Cloudflare**: Automatic deployment on push

## Performance & Monitoring
- **Cloudflare Analytics**: Traffic and performance metrics
- **Core Web Vitals**: Performance monitoring
- **Error Tracking**: Built-in error handling
- **Observability**: Cloudflare Workers observability

## Development Environment
- **Node.js**: Runtime for development
- **npm**: Package manager
- **Git**: Version control
- **VS Code**: Recommended editor with extensions

## Key Dependencies
```json
{
  "@astrojs/cloudflare": "^12.6.0",
  "@astrojs/mdx": "^4.3.0",
  "@astrojs/svelte": "*",
  "astro": "^5.11.0",
  "bcrypt": "^6.0.0",
  "better-sqlite3": "^11.10.0",
  "googleapis": "^140.0.1",
  "jose": "^5.10.0",
  "typescript": "5.7.2"
}
```

## Architecture Patterns
- **JAMstack**: JavaScript, APIs, and Markup
- **Server-Side Rendering**: Hybrid static/dynamic rendering
- **Edge Computing**: Global distribution via Cloudflare
- **Component-Based**: Reusable UI components
- **API-First**: RESTful endpoints for data access