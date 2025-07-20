# Codebase Map

## Directory Structure Overview

```
baba-is-win/
├── .project/              # Project documentation (NEW)
├── docs/                  # Additional documentation
├── migrations/            # Database migration files
├── public/               # Static assets
├── scripts/              # Build and utility scripts
├── src/                  # Main source code
├── tests/                # Test files
└── worktrees/            # Git worktrees
```

## Source Code Organization (`/src`)

### Components (`/src/components`)
- `BaseHead.astro` - HTML head component with meta tags
- `Bio.astro` - Author biography component
- `Carousel.astro` - Image carousel for blog posts
- `EmailPreferences.astro` - Email subscription management
- `Footer.astro` - Site footer
- `Header.astro` - Site header with navigation
- `Logo.astro` - Site logo component
- `Nav.astro` - Navigation component
- `SuccessMessage.astro` - Success feedback component
- `ThemeToggleButton.svelte` - Dark/light theme toggle

#### Admin Components (`/src/components/admin`)
- `EmailDebugDashboard.astro` - Email system debugging
- `EmailStatistics.astro` - Email analytics dashboard
- `NotificationDashboard.astro` - Notification management

#### Authentication Components (`/src/components/auth`)
- `GoogleOAuthButton.astro` - Google sign-in button

#### Museum Components (`/src/components/museum`)
- `MuseumFilters.svelte` - Project filtering interface
- `MuseumGallery.astro` - Project gallery display
- `MuseumLayout.astro` - Museum page layout
- `ProjectCard.astro` - Individual project cards

### Data Layer (`/src/data`)

#### Blog Posts (`/src/data/blog-posts`)
- `draft/` - Unpublished blog posts
- `published/` - Published blog posts (markdown files)

#### Configuration (`/src/data`)
- `museum-config.json` - Museum/portfolio configuration
- `subtitles.json` - Site subtitle configuration

#### Guides (`/src/data/guides`)
- `20250716_google_oauth_signin.md` - OAuth implementation guide

#### Thoughts (`/src/data/thoughts`)
- `draft/` - Draft thoughts
- `published/` - Published micro-posts
- `spicy-takes/` - Controversial opinions

### Library Layer (`/src/lib`)

#### Authentication (`/src/lib/auth`)
- `auth-service.ts` - Core authentication logic
- `db.ts` - Database connection and queries
- `jwt.ts` - JWT token handling
- `password.ts` - Password hashing utilities
- `types.ts` - Authentication type definitions
- `user-manager.ts` - User management operations

#### Email System (`/src/lib/email`)
- `content-processor.ts` - Content processing for emails
- `error-handler.ts` - Email error handling
- `gmail-auth-enhanced.ts` - Enhanced Gmail authentication
- `gmail-auth.ts` - Basic Gmail authentication
- `notification-service-enhanced.ts` - Advanced notifications
- `notification-service.ts` - Basic notification service
- `resend-service.ts` - Resend email service
- `simple-notification-service.ts` - Simple email notifications
- `template-engine.ts` - Email template processing
- `unsubscribe-service.ts` - Unsubscribe handling

#### Email Templates (`/src/lib/email/templates`)
- `blog-notification.html/txt` - Blog post notifications
- `thought-notification.html/txt` - Thought notifications
- `unsubscribe-confirmation.html/txt` - Unsubscribe confirmations
- `welcome-email.html/txt` - Welcome messages

#### External APIs (`/src/lib/github`)
- `api.ts` - GitHub API integration
- `types.ts` - GitHub API type definitions

#### Monitoring (`/src/lib/monitoring`)
- `email-event-logger.ts` - Email event logging
- `email-monitor.ts` - Email system monitoring

#### OAuth (`/src/lib/oauth`)
- `config.ts` - OAuth configuration
- `google.ts` - Google OAuth implementation
- `rate-limiter.ts` - Rate limiting for OAuth
- `security-monitor.ts` - Security monitoring
- `state.ts` - OAuth state management
- `validation.ts` - OAuth validation

### Page Layer (`/src/pages`)

#### Core Pages
- `index.astro` - Homepage
- `about.astro` - About page
- `bio.astro` - Biography page
- `login.astro` - Login page
- `signup.astro` - User registration
- `profile.astro` - User profile
- `unsubscribe.astro` - Email unsubscribe

#### Blog System (`/src/pages/blog`)
- `index.astro` - Blog listing
- `[slug].astro` - Individual blog posts

#### Museum System (`/src/pages/museum`)
- `index.astro` - Museum/portfolio listing
- `[project].astro` - Individual project pages

#### Thoughts System (`/src/pages/thoughts`)
- `index.astro` - Thoughts listing
- `[slug].astro` - Individual thoughts

#### Tag System (`/src/pages/tags`)
- `index.astro` - Tag listing
- `[tag].astro` - Posts by tag

#### Admin Pages (`/src/pages/admin`)
- `new-thought.astro` - Create new thoughts
- `notifications.astro` - Notification management

### API Layer (`/src/pages/api`)

#### Admin APIs (`/src/pages/api/admin`)
- `check-notifications.ts` - Check notification status
- `debug-content.ts` - Content debugging
- `email-status.ts` - Email system status
- `notifications.ts` - Notification management
- `reset-notifications.ts` - Reset notification state
- `subscribe-user.ts` - User subscription management
- Various testing endpoints

#### Authentication APIs (`/src/pages/api/auth`)
- `login.ts` - User login
- `logout.ts` - User logout
- `signup.ts` - User registration
- `me.ts` - Current user info
- `status.ts` - Authentication status

#### Google OAuth APIs (`/src/pages/api/auth/google`)
- `google.ts` - OAuth initiation
- `callback.ts` - OAuth callback handling
- `disconnect.ts` - OAuth disconnection
- `status.ts` - OAuth status

#### Cron Jobs (`/src/pages/api/cron`)
- `process-notifications.ts` - Scheduled notification processing
- `process-single-notification.ts` - Single notification processing

#### User APIs (`/src/pages/api/user`)
- `preferences.ts` - User preference management
- `unsubscribe.ts` - Email unsubscription

### Utility Layer (`/src/utils`)
- `getPostData.ts` - Post data extraction
- `simpleMarkdown.js` - Markdown processing

### Styling (`/src/styles`)
- `global.css` - Global styles and CSS variables
- `auth.css` - Authentication page styles
- `fonts.css` - Font definitions
- `museum.css` - Museum/portfolio styles

## Static Assets (`/public`)

### Images (`/public/assets`)
- `baba/` - Baba Is You game assets
- `blog/` - Blog post images organized by date
- `fonts/` - Web font files
- `logos/` - Brand logos
- `museum/` - Project screenshots
- `thoughts/` - Thought images
- Portrait and profile images

## Configuration Files

### Build Configuration
- `astro.config.mjs` - Astro framework configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

### Deployment Configuration
- `wrangler.json` - Cloudflare Workers configuration
- `wrangler.personal.json` - Personal deployment config
- `worker-configuration.d.ts` - Worker type definitions

### Development Configuration
- `.gitignore` - Git ignore patterns
- `Makefile` - Development commands
- `jest.config.js` - Jest testing (legacy)

## Database Layer (`/migrations`)

Sequential SQL migration files for database schema evolution:
- User authentication and management
- Email notification system
- Content tracking and management
- OAuth integration
- System optimization

## Testing Infrastructure (`/tests`)

- Unit tests for email functionality
- Integration tests for complete flows
- Performance and security validation
- Mock implementations for external services
- Test fixtures and setup utilities

## Documentation (`/docs`)

- Planning documents for new features
- Implementation guides
- Architecture decisions
- API documentation

## Key File Relationships

### Authentication Flow
1. `/src/pages/login.astro` → `/src/lib/auth/auth-service.ts`
2. `/src/lib/auth/auth-service.ts` → `/src/lib/auth/db.ts`
3. JWT handling via `/src/lib/auth/jwt.ts`

### Content Management
1. Content files in `/src/data/blog-posts/` and `/src/data/thoughts/`
2. Processing via `/src/utils/getPostData.ts`
3. Display via `/src/pages/blog/[slug].astro` and `/src/pages/thoughts/[slug].astro`

### Email System
1. Content changes trigger `/src/lib/email/notification-service.ts`
2. Templates in `/src/lib/email/templates/`
3. Delivery via Gmail API integration

### Museum/Portfolio
1. Configuration in `/src/data/museum-config.json`
2. GitHub integration via `/src/lib/github/api.ts`
3. Display via `/src/pages/museum/` components