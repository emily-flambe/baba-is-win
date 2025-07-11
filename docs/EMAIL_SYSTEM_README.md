# Email Notifications System

## Overview

The Email Notifications System is a comprehensive email service built for the Baba Is Win personal blog platform. It provides automated email notifications for new blog posts, thoughts, and announcements, with robust error handling, performance monitoring, and user preference management.

## Features

### Core Features
- **Automated Notifications**: Sends email notifications for new blog posts and thoughts
- **Gmail Integration**: Uses Gmail API for reliable email delivery
- **Template System**: Customizable email templates with variable substitution
- **Unsubscribe Management**: One-click unsubscribe with token-based authentication
- **User Preferences**: Granular control over notification types
- **Admin Dashboard**: Comprehensive management interface for monitoring and control

### Advanced Features
- **Batch Processing**: Efficient handling of large subscriber lists
- **Error Handling**: Comprehensive error categorization and retry logic
- **Performance Monitoring**: Real-time metrics and health checks
- **Circuit Breaker**: Automatic failover protection
- **Rate Limiting**: Prevents API quota exhaustion
- **Security**: Input validation, token security, and CSRF protection

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   API Layer     │    │   Email Service │
│                 │    │                 │    │                 │
│ • Preferences   │◄──►│ • Auth Routes   │◄──►│ • Gmail API     │
│ • Unsubscribe   │    │ • User Routes   │    │ • Templates     │
│ • Admin Panel   │    │ • Admin Routes  │    │ • Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Monitoring    │    │   Background    │
│                 │    │                 │    │                 │
│ • Users         │    │ • Metrics       │    │ • Cron Jobs     │
│ • Notifications │    │ • Health Checks │    │ • Retry Logic   │
│ • Templates     │    │ • Alerts        │    │ • Queue Proc.   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema

#### Core Tables
- `users` - User accounts with email preferences
- `email_notifications` - Individual notification records
- `email_notification_history` - Audit trail of email actions
- `email_templates` - Customizable email templates
- `unsubscribe_tokens` - Secure unsubscribe tokens
- `content_items` - Blog posts and thoughts for notifications
- `email_statistics` - Daily email metrics

#### Key Relationships
- Users have many email notifications
- Email notifications reference content items
- Templates are used for rendering emails
- Unsubscribe tokens are linked to users

## Setup and Installation

### Prerequisites
- Node.js 18+
- Cloudflare Workers account
- Gmail API credentials
- Domain for email sending

### Gmail API Setup

1. **Create Google Cloud Project**
   ```bash
   # Visit https://console.cloud.google.com/
   # Create new project: "email-notifications"
   ```

2. **Enable Gmail API**
   ```bash
   # In Google Cloud Console:
   # APIs & Services → Library → Gmail API → Enable
   ```

3. **Create OAuth2 Credentials**
   ```bash
   # APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
   # Application type: Web application
   # Authorized redirect URIs: https://developers.google.com/oauthplayground
   ```

4. **Generate Refresh Token**
   ```bash
   # Visit https://developers.google.com/oauthplayground
   # Select Gmail API v1 → https://www.googleapis.com/auth/gmail.send
   # Authorize and exchange authorization code for tokens
   ```

### Environment Configuration

Create `.env` file:
```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_FROM_EMAIL=your_sender_email@gmail.com

# Site Configuration
SITE_URL=https://your-domain.com
SITE_NAME="Your Site Name"

# Security
JWT_SECRET=your_jwt_secret_key
CRON_SECRET=your_cron_secret_key

# Database
DB=your_cloudflare_d1_database
```

### Deployment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Database Migrations**
   ```bash
   # Development
   npm run dev:setup
   
   # Production
   wrangler d1 execute DB --file=migrations/0004_add_email_notifications.sql
   wrangler d1 execute DB --file=migrations/0005_add_email_history.sql
   wrangler d1 execute DB --file=migrations/0006_add_content_tracking.sql
   wrangler d1 execute DB --file=migrations/0007_add_email_templates.sql
   wrangler d1 execute DB --file=migrations/0008_add_unsubscribe_tokens.sql
   wrangler d1 execute DB --file=migrations/0009_enhance_users_for_email.sql
   wrangler d1 execute DB --file=migrations/0010_add_email_statistics.sql
   ```

3. **Set Wrangler Secrets**
   ```bash
   wrangler secret put GMAIL_CLIENT_ID
   wrangler secret put GMAIL_CLIENT_SECRET
   wrangler secret put GMAIL_REFRESH_TOKEN
   wrangler secret put GMAIL_FROM_EMAIL
   wrangler secret put JWT_SECRET
   wrangler secret put CRON_SECRET
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

## Usage

### User Registration and Preferences

Users can sign up and manage their email preferences:

```typescript
// Example user preference structure
{
  emailBlogUpdates: true,      // Receive blog post notifications
  emailThoughtUpdates: true,   // Receive thought notifications
  emailAnnouncements: false,   // Receive announcement notifications
  unsubscribeAll: false        // Global unsubscribe flag
}
```

### Email Templates

The system uses customizable email templates with variable substitution:

```html
<!-- Blog notification template -->
<h1>{{title}}</h1>
<p>Hi {{user_name}},</p>
<p>{{description}}</p>
<a href="{{url}}">Read Full Post</a>
<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
```

### Sending Notifications

Notifications are triggered automatically when new content is published:

```typescript
// Automatic notification trigger
const notificationService = new EmailNotificationService(env, db);
await notificationService.sendBlogNotification(blogPost);
```

### Admin Management

Access the admin dashboard at `/admin/notifications` to:
- View email statistics
- Monitor notification queue
- Retry failed notifications
- Send manual notifications
- View subscriber analytics

## API Reference

### User Endpoints

#### Get User Preferences
```http
GET /api/user/preferences
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "emailBlogUpdates": true,
  "emailThoughtUpdates": true,
  "emailAnnouncements": false,
  "unsubscribeAll": false
}
```

#### Update User Preferences
```http
PUT /api/user/preferences
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "emailBlogUpdates": false,
  "emailThoughtUpdates": true,
  "emailAnnouncements": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email preferences updated successfully"
}
```

#### Unsubscribe
```http
POST /api/user/unsubscribe
Content-Type: application/json

{
  "token": "secure_unsubscribe_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from all notifications"
}
```

### Admin Endpoints

#### Get Notification Statistics
```http
GET /api/admin/notifications
Authorization: Bearer {admin_jwt_token}
```

**Response:**
```json
{
  "stats": {
    "total": 150,
    "sent": 140,
    "failed": 8,
    "pending": 2,
    "retryable": 5
  },
  "subscriberStats": {
    "blog": 45,
    "thought": 38,
    "announcement": 22,
    "total": 50
  },
  "recentNotifications": [...],
  "unnotifiedContent": [...]
}
```

#### Send Manual Notification
```http
POST /api/admin/notifications
Content-Type: application/json
Authorization: Bearer {admin_jwt_token}

{
  "action": "send_notification",
  "contentId": "blog-post-slug",
  "contentType": "blog",
  "force": false
}
```

#### Retry Failed Notifications
```http
POST /api/admin/notifications
Content-Type: application/json
Authorization: Bearer {admin_jwt_token}

{
  "action": "retry_failed"
}
```

### Background Processing

#### Process Notifications (Cron)
```http
POST /api/cron/process-notifications
Authorization: Bearer {cron_secret}
```

## Configuration

### Email Templates

Templates support variable substitution with `{{variable_name}}` syntax:

#### Available Variables
- `{{title}}` - Content title
- `{{description}}` - Content description (blog posts)
- `{{content}}` - Content body (thoughts)
- `{{url}}` - Content URL
- `{{unsubscribe_url}}` - Unsubscribe URL
- `{{publish_date}}` - Publication date
- `{{tags}}` - Content tags
- `{{site_name}}` - Site name
- `{{site_url}}` - Site URL
- `{{user_name}}` - User's name

#### Template Types
- `blog_notification` - New blog post notifications
- `thought_notification` - New thought notifications
- `welcome_email` - Welcome email for new users
- `unsubscribe_confirmation` - Unsubscribe confirmation

### Error Handling

The system categorizes errors and handles them appropriately:

#### Error Categories
- **Rate Limit**: API rate limiting (retry in 15 minutes)
- **Invalid Email**: Permanent failure, no retry
- **Quota Exceeded**: Daily quota exceeded (retry next day)
- **Auth Error**: Authentication failure (retry in 5 minutes)
- **Network Error**: Temporary network issue (retry in 5 minutes)
- **Generic Error**: Unknown error (retry in 5 minutes)

#### Retry Logic
- Maximum 3 retry attempts
- Exponential backoff: 5 minutes, 10 minutes, 20 minutes
- Permanent failure after 3 attempts for retriable errors

## Performance Optimization

### Batch Processing
- Notifications processed in batches of 10
- 2-second delay between batches
- Prevents API rate limiting

### Monitoring
- Real-time performance metrics
- Health checks for all services
- Automated alerting for issues

### Circuit Breaker
- Automatic failover on 5 consecutive failures
- 5-minute reset timeout
- Prevents cascading failures

## Security

### Input Validation
- All user inputs sanitized
- Email address validation
- URL validation for security

### Token Security
- Cryptographically secure tokens
- Time-limited expiration
- Single-use enforcement

### Authentication
- JWT-based authentication
- Admin role verification
- Rate limiting on all endpoints

## Monitoring and Alerts

### Metrics Tracked
- Email delivery success rate
- Bounce rate
- Unsubscribe rate
- Queue size
- Processing time
- Error rates

### Alert Conditions
- Bounce rate > 10%
- Success rate < 90%
- Pending notifications > 50
- Unsubscribe rate > 5%
- No emails sent in 24 hours

### Health Checks
- Database connectivity
- Email service availability
- Queue processing status
- System resource usage

## Troubleshooting

### Common Issues

#### Gmail API Errors
```
Error: Daily sending quota exceeded
Solution: Wait 24 hours or upgrade Gmail API quota
```

#### Authentication Failures
```
Error: Invalid credentials
Solution: Regenerate Gmail refresh token
```

#### Database Connection
```
Error: Database connection failed
Solution: Check Cloudflare D1 binding configuration
```

### Debug Mode
```bash
# Enable debug logging
npm run dev:debug

# View detailed logs
wrangler tail --format=pretty
```

### Performance Issues
```bash
# Check queue size
npm run admin:queue-status

# Monitor processing times
npm run admin:performance-metrics
```

## Testing

### Run Test Suite
```bash
# All tests
npm test

# Specific test category
npm test -- tests/email/template-engine.test.ts

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Performance Tests**: Load and scalability testing
- **Security Tests**: Security validation
- **Quality Tests**: Standards compliance

## Development

### Local Development
```bash
# Start development server
npm run dev

# Run with email service
npm run dev:email

# Debug mode
npm run dev:debug
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Support

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Setup Guide](./SETUP_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

### Resources
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Issue Tracker](https://github.com/your-repo/issues)

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**License:** MIT