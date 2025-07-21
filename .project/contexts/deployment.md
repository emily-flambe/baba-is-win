# Deployment & Infrastructure Configuration

For environment variables, see [.env.example](../.env.example).

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

### Running Migrations
```bash
# Local development
wrangler d1 migrations apply baba-is-win-db --local

# Production
wrangler d1 migrations apply baba-is-win-db
```

## Cloudflare Workers Configuration

### Workers Settings
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

## Security Considerations

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

### Secret Management
- Use `wrangler secret put <key>` for production secrets
- Never commit secrets to version control
- Rotate secrets regularly
- Use different values for dev/staging/production

## Deployment Process

### Prerequisites
1. Cloudflare account with Workers access
2. D1 database configured
3. Wrangler CLI installed and authenticated

### Production Deployment
```bash
# Build the application
npm run build

# Deploy to Cloudflare Workers
npm run deploy

# Set production secrets (one time)
wrangler secret put JWT_SECRET
wrangler secret put API_KEY_SALT
wrangler secret put GMAIL_CLIENT_SECRET
# ... etc for all secrets
```

### Monitoring & Observability
- Use Cloudflare Workers Analytics for traffic monitoring
- Check Workers Tail for real-time logs
- Monitor D1 database metrics
- Set up alerts for error rates