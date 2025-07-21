# Baba Is Win - Project Configuration

## Project Overview

**Name:** baba-is-win  
**Type:** Personal Blog & Portfolio Website  
**Repository:** [github.com/emilycogsdill/baba-is-win](https://github.com/emilycogsdill/baba-is-win)  

**Description:** A modern personal website and blog built with Astro, featuring blog posts, thoughts, museum portfolio, and authentication system. The site combines static content with dynamic authentication features deployed on a single Cloudflare Worker named 'personal' with one D1 database named 'baba-is-win-db'.

**Key Features:**
- JWT-based authentication with HTTP-only cookies
- Markdown-based content management system
- Gmail API email notification system
- Museum portfolio with project showcases
- Automated deployment pipeline
- D1 database with migrations

## Architecture & Technology Stack

### Core Technologies
- **Framework:** Astro v5.11.0
- **Language:** TypeScript
- **Runtime:** Single Cloudflare Worker (named 'personal')  
- **Database:** Single Cloudflare D1 database (named 'baba-is-win-db')
- **Styling:** CSS (custom)
- **Testing:** Vitest/Jest
- **Build Tool:** Astro + Wrangler

### Deployment Architecture
- **Production:** Cloudflare Pages with auto-deployment
- **Database:** Single D1 database ('baba-is-win-db') 
- **Worker:** Single Cloudflare Worker ('personal') for all API endpoints
- **Domain:** baba-is-win.com
- **Development:** localhost:4321

### Project Structure
```
src/
├── components/          # Astro and Svelte components
│   ├── auth/           # Authentication components
│   ├── admin/          # Admin dashboard components
│   └── museum/         # Portfolio components
├── pages/              # Astro pages and API routes
│   ├── api/            # API endpoints (auth, admin, cron)
│   ├── blog/           # Blog pages
│   ├── thoughts/       # Thoughts pages
│   └── museum/         # Portfolio pages
├── lib/                # Core libraries
│   ├── auth/           # Authentication services
│   ├── email/          # Email notification system
│   ├── oauth/          # OAuth integration
│   └── monitoring/     # System monitoring
├── data/               # Content and configuration
│   ├── blog-posts/     # Blog content (published/draft)
│   ├── thoughts/       # Thoughts content
│   └── museum-config.json
└── styles/             # Global and component styles
```

### Database Schema
The application uses a single Cloudflare D1 database named 'baba-is-win-db' with automated migrations located in `/migrations/`. Key tables include:
- User authentication and profiles
- Email preferences and notifications
- Content tracking and statistics
- OAuth integration data

## Development Standards

### File Operations
- **ALWAYS prefer editing existing files over creating new ones**
- **NEVER proactively create documentation files unless explicitly requested**
- Use absolute paths for all file operations
- Quote file paths containing spaces with double quotes

### Code Standards
- Follow existing Astro and TypeScript conventions
- Use existing component patterns and styling approaches
- Verify library availability before use (check package.json)
- Never add comments unless explicitly requested
- Maintain professional, technical tone in all code

### Testing & Validation
Essential commands for quality assurance:
```bash
npm run test          # Vitest test suite
npm run test:coverage # Test coverage reports
npm run test:types    # TypeScript validation
npm run build         # Production build verification
```

### Build Commands
```bash
# Development
npm run dev           # Local development server
npm run dev:pages     # Cloudflare Pages development
npm run preview       # Preview production build

# Database
make migrate          # Run database migrations
make reset-db         # Reset database
make backup-db        # Backup database
make restore-db       # Restore database

# Testing & Quality
npm run test          # Run test suite
npm run test:coverage # Coverage reports
npm run test:ui       # Interactive test UI

# Deployment
npm run build         # Build for production
npm run check         # Full validation check
```

### Security Standards
- Protect environment variables and secrets
- Use JWT authentication patterns for user management
- Implement proper OAuth flows with security monitoring
- Follow HTTPS-only policies
- Validate all user inputs

## AI Assistant Guidelines

### Communication Standards
- Maintain serious, professional tone in all interactions
- Be direct and straightforward without unnecessary personality or humor
- Focus on functionality and technical accuracy over entertainment value
- Avoid excessive emojis, jokes, or overly casual language
- Always render mermaid diagrams as high-resolution PNG files

### Development Workflow
1. **Before making changes:** Read existing files to understand current implementation
2. **Testing:** Always run tests before and after changes
3. **File operations:** Prefer editing over creating new files
4. **Commits:** Never commit changes unless explicitly requested
5. **Security:** Protect sensitive data and follow authentication patterns

### Deployment Considerations
- **Auto-deployment enabled:** Cloudflare Workers auto-deploys on git push to main
- **DO NOT add wrangler deploy to CI/CD:** Conflicts with auto-deployment
- **Email notifications:** Use cron jobs (every 6 hours) + manual trigger
- **Workflow pattern:** Content change → Auto-deploy → Wait 2 minutes → Trigger emails

### Critical Environment Setup
For Cloudflare Workers development, ensure `/cloudflare/workers/.dev.vars` exists with:
```
JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only
```

### Content Management
- Blog posts: `/src/data/blog-posts/published/`
- Thoughts: `/src/data/thoughts/published/`
- Assets: `/public/assets/` with proper subdirectories
- Use markdown format for all content
- Follow existing naming conventions (YYYYMMDD-title.md)

## Context Integration

This unified configuration works with modular context files:
- `.project/context-astro.md` - Astro-specific patterns and conventions
- `.project/context-cloudflare.md` - Cloudflare Workers deployment and D1 database
- `.project/context-auth.md` - Authentication and OAuth implementation
- `.project/context-email.md` - Email notification system
- `.project/context-content.md` - Content management and markdown processing

## Quick Reference

### Essential File Locations
- **Project config:** `.project/config.md` (this file)
- **Package config:** `package.json`
- **Astro config:** `astro.config.mjs`  
- **Wrangler config:** `wrangler.json`
- **Database migrations:** `/migrations/`
- **Content:** `/src/data/`
- **Components:** `/src/components/`
- **API routes:** `/src/pages/api/`

### Development URLs
- **Local:** http://localhost:4321
- **Production:** https://baba-is-win.com
- **Admin:** `/admin/notifications`
- **Auth:** `/login`, `/signup`, `/profile`

---

*This configuration serves as the foundation for all AI assistant interactions with the Baba Is Win project. It provides tool-agnostic guidance while maintaining compatibility with the existing Astro + Cloudflare Workers architecture.*