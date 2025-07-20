# Environment Configuration

## Development Environment

### Required Environment Variables (.dev.vars)
```env
# Authentication
JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only

# Google OAuth (when implementing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback

# Gmail API (for email notifications)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Site Configuration
SITE_URL=http://localhost:8787
SITE_NAME=Emily's Blog (Dev)
ENVIRONMENT=development
```

## Production Environment

### Cloudflare Workers Secrets
Set via `wrangler secret put <key>`:
- `JWT_SECRET`: Production JWT signing key
- `API_KEY_SALT`: Production API key salt
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GMAIL_CLIENT_ID`: Gmail API client ID
- `GMAIL_CLIENT_SECRET`: Gmail API client secret
- `GMAIL_REFRESH_TOKEN`: Gmail API refresh token

### Cloudflare Workers Variables (wrangler.json)
```json
{
  "vars": {
    "SITE_URL": "https://personal.emily-cogsdill.workers.dev",
    "SITE_NAME": "Emily's Blog",
    "ENVIRONMENT": "preview"
  }
}
```

## Database Configuration

### Cloudflare D1 Database
- **Name**: baba-is-win-db
- **ID**: db4b6f95-ed48-4723-8c77-ee3a028d117e
- **Binding**: DB

### Migration Files
Located in `/migrations/`:
- `0001_create_auth_tables.sql` - User authentication
- `0002_add_email_preferences.sql` - Email settings
- `0003_add_announcements_preference.sql` - Announcement settings
- `0004_add_email_notifications.sql` - Notification system
- `0005_add_email_history.sql` - Email tracking
- `0006_add_content_tracking.sql` - Content management
- `0007_add_email_templates.sql` - Template system
- `0008_add_unsubscribe_tokens.sql` - Unsubscribe handling
- `0009_enhance_users_for_email.sql` - User enhancements
- `0010_add_email_statistics.sql` - Email analytics
- `0011_add_email_events_system.sql` - Event tracking
- `0012_add_oauth_fields.sql` - OAuth integration
- `0013_simplify_email_system.sql` - System cleanup

## Development Server Setup

### Prerequisites
1. Node.js 18+ installed
2. npm package manager
3. Cloudflare account with Workers access
4. D1 database configured

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values

# Run database migrations
wrangler d1 migrations apply baba-is-win-db --local

# Start development server
npm run dev
```

### Environment File Template (.dev.vars.example)
```env
# CRITICAL: This file must exist for authentication to work
# Copy to .dev.vars and fill with your values

# Required for JWT authentication
JWT_SECRET=generate-a-secure-random-string-here
API_KEY_SALT=generate-another-secure-random-string-here

# Google OAuth (optional for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback

# Gmail API (optional for email features)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Site settings
SITE_URL=http://localhost:8787
SITE_NAME=Emily's Blog (Dev)
ENVIRONMENT=development
```

## Security Considerations

### Environment Variable Security
- Never commit `.dev.vars` to version control
- Use strong random values for secrets
- Rotate secrets regularly
- Use different values for dev/staging/production

### Database Security
- Use parameterized queries
- Validate all inputs
- Limit database permissions
- Monitor for suspicious activity

### API Security
- Implement rate limiting
- Validate request origins
- Use HTTPS in production
- Monitor API usage patterns

## Deployment Configuration

### Cloudflare Workers Settings
- **Compatibility Date**: 2024-11-01
- **Compatibility Flags**: nodejs_compat
- **Upload Source Maps**: true
- **Observability**: enabled

### DNS Configuration
- Domain: emily-cogsdill.workers.dev
- Subdomain: personal
- Full URL: https://personal.emily-cogsdill.workers.dev

### Asset Configuration
- Static assets served from `/dist`
- Images optimized via Sharp
- Fonts preloaded for performance