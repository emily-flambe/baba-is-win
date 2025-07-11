# Email Notifications System - Setup Guide

## Overview

This guide will walk you through setting up the email notifications system from scratch, including Gmail API configuration, database setup, and deployment to Cloudflare Workers.

## Prerequisites

### Required Accounts
- [Google Cloud Console](https://console.cloud.google.com/) account
- [Cloudflare](https://cloudflare.com/) account
- [GitHub](https://github.com/) account (for deployment)
- Domain name (for sending emails)

### Required Software
- Node.js 18+ and npm
- Git
- Wrangler CLI (Cloudflare Workers CLI)

### Installation Commands
```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/

# Install Wrangler CLI
npm install -g wrangler

# Verify installations
node --version
npm --version
wrangler --version
```

## Step 1: Gmail API Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Enter project name: "email-notifications-system"
4. Click "Create"
5. Select your new project from the dropdown

### 1.2 Enable Gmail API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### 1.3 Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "Email Notifications System"
   - User support email: Your email
   - Developer contact information: Your email
4. Application type: "Web application"
5. Name: "Email Notifications Client"
6. Authorized redirect URIs: `https://developers.google.com/oauthplayground`
7. Click "Create"
8. **Save the Client ID and Client Secret** - you'll need these later

### 1.4 Generate Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, find "Gmail API v1"
6. Select `https://www.googleapis.com/auth/gmail.send`
7. Click "Authorize APIs"
8. Sign in with your Google account
9. Grant permissions
10. Click "Exchange authorization code for tokens"
11. **Save the Refresh Token** - you'll need this later

### 1.5 Verify Email Sending

Test your setup with a quick verification:

```bash
# Create a test script
cat > test-gmail.js << 'EOF'
const https = require('https');
const querystring = require('querystring');

const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REFRESH_TOKEN = 'your_refresh_token';

// Get access token
const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token'
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        resolve(response.access_token);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// Test the setup
getAccessToken().then(token => {
  console.log('✅ Gmail API setup successful!');
  console.log('Access token obtained:', token ? 'Yes' : 'No');
}).catch(err => {
  console.error('❌ Gmail API setup failed:', err);
});
EOF

# Replace the credentials and run the test
node test-gmail.js
```

## Step 2: Cloudflare Setup

### 2.1 Cloudflare Account Setup

1. Sign up for [Cloudflare](https://cloudflare.com/) if you haven't already
2. Add your domain to Cloudflare
3. Update your domain's nameservers to Cloudflare's nameservers
4. Wait for DNS propagation (can take up to 24 hours)

### 2.2 Cloudflare Workers Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on "Workers & Pages"
3. Click "Create application"
4. Click "Create Worker"
5. Name your worker: "email-notifications"
6. Click "Deploy"

### 2.3 Cloudflare D1 Database Setup

1. In the Cloudflare dashboard, go to "D1 SQL Database"
2. Click "Create database"
3. Name: "email-notifications-db"
4. Click "Create"
5. Note the database ID - you'll need this for wrangler.toml

### 2.4 Wrangler Authentication

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

## Step 3: Project Setup

### 3.1 Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/your-username/baba-is-win.git
cd baba-is-win

# Create and switch to email feature branch
git checkout -b feature-email-notifications

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3.2 Configure Environment Variables

Edit `.env` file:

```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token_here
GMAIL_FROM_EMAIL=your_sender_email@gmail.com

# Site Configuration
SITE_URL=https://your-domain.com
SITE_NAME=Your Site Name

# Security
JWT_SECRET=your_super_secret_jwt_key_here
CRON_SECRET=your_cron_secret_key_here

# Development
NODE_ENV=development
```

### 3.3 Update wrangler.toml

```toml
name = "email-notifications"
main = "dist/index.js"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "email-notifications-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "email-notifications-db"
database_id = "your_database_id_here"

[env.development]
name = "email-notifications-dev"

[[env.development.d1_databases]]
binding = "DB"
database_name = "email-notifications-db-dev"
database_id = "your_dev_database_id_here"
```

## Step 4: Database Setup

### 4.1 Run Database Migrations

```bash
# Development database
wrangler d1 execute DB --env=development --file=migrations/0001_create_auth_tables.sql
wrangler d1 execute DB --env=development --file=migrations/0002_add_email_preferences.sql
wrangler d1 execute DB --env=development --file=migrations/0003_add_announcements_preference.sql
wrangler d1 execute DB --env=development --file=migrations/0004_add_email_notifications.sql
wrangler d1 execute DB --env=development --file=migrations/0005_add_email_history.sql
wrangler d1 execute DB --env=development --file=migrations/0006_add_content_tracking.sql
wrangler d1 execute DB --env=development --file=migrations/0007_add_email_templates.sql
wrangler d1 execute DB --env=development --file=migrations/0008_add_unsubscribe_tokens.sql
wrangler d1 execute DB --env=development --file=migrations/0009_enhance_users_for_email.sql
wrangler d1 execute DB --env=development --file=migrations/0010_add_email_statistics.sql

# Production database (when ready)
wrangler d1 execute DB --env=production --file=migrations/0001_create_auth_tables.sql
# ... repeat for all migration files
```

### 4.2 Verify Database Setup

```bash
# Check tables were created
wrangler d1 execute DB --env=development --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check a specific table
wrangler d1 execute DB --env=development --command="SELECT * FROM email_notifications LIMIT 5;"
```

## Step 5: Configuration and Secrets

### 5.1 Set Wrangler Secrets

```bash
# Set production secrets
wrangler secret put GMAIL_CLIENT_ID --env=production
wrangler secret put GMAIL_CLIENT_SECRET --env=production
wrangler secret put GMAIL_REFRESH_TOKEN --env=production
wrangler secret put GMAIL_FROM_EMAIL --env=production
wrangler secret put JWT_SECRET --env=production
wrangler secret put CRON_SECRET --env=production
wrangler secret put SITE_URL --env=production
wrangler secret put SITE_NAME --env=production

# Set development secrets
wrangler secret put GMAIL_CLIENT_ID --env=development
wrangler secret put GMAIL_CLIENT_SECRET --env=development
wrangler secret put GMAIL_REFRESH_TOKEN --env=development
wrangler secret put GMAIL_FROM_EMAIL --env=development
wrangler secret put JWT_SECRET --env=development
wrangler secret put CRON_SECRET --env=development
wrangler secret put SITE_URL --env=development
wrangler secret put SITE_NAME --env=development
```

### 5.2 Verify Secrets

```bash
# List all secrets
wrangler secret list --env=production
wrangler secret list --env=development
```

## Step 6: Local Development

### 6.1 Start Development Server

```bash
# Build and start development server
npm run dev

# Alternative: UI-only development (no email functionality)
npm run dev:astro
```

### 6.2 Test Local Setup

1. Open http://localhost:8787 in your browser
2. Register a new user account
3. Check email preferences in profile
4. Verify database entries:
   ```bash
   wrangler d1 execute DB --env=development --command="SELECT * FROM users;"
   ```

### 6.3 Test Email Functionality

```bash
# Create a test user
wrangler d1 execute DB --env=development --command="
INSERT INTO users (email, username, password_hash, email_blog_updates, email_thought_updates)
VALUES ('test@example.com', 'testuser', 'dummy_hash', 1, 1);"

# Test notification creation
curl -X POST http://localhost:8787/api/admin/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_token" \
  -d '{
    "action": "send_notification",
    "contentId": "test-post",
    "contentType": "blog"
  }'
```

## Step 7: Production Deployment

### 7.1 Build and Deploy

```bash
# Build the project
npm run build

# Deploy to production
npm run deploy

# Or deploy with wrangler directly
wrangler deploy --env=production
```

### 7.2 Verify Deployment

```bash
# Check deployment status
wrangler deployments list --env=production

# Test production endpoint
curl https://your-domain.com/api/health
```

### 7.3 Setup Cron Triggers

```bash
# Add cron trigger for notification processing
wrangler triggers deploy --env=production
```

Add to your `wrangler.toml`:

```toml
[triggers]
crons = ["0 */10 * * *"]  # Every 10 minutes
```

## Step 8: DNS and Domain Configuration

### 8.1 Custom Domain Setup

1. In Cloudflare dashboard, go to "Workers & Pages"
2. Click on your worker
3. Go to "Settings" → "Triggers"
4. Click "Add Custom Domain"
5. Enter your domain: `email-notifications.your-domain.com`
6. Click "Add Custom Domain"

### 8.2 Email Domain Configuration

Add these DNS records to your domain:

```
Type: TXT
Name: @
Value: "v=spf1 include:_spf.google.com ~all"

Type: TXT
Name: _dmarc
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@your-domain.com"

Type: TXT
Name: google._domainkey
Value: "v=DKIM1; k=rsa; p=your_dkim_public_key"
```

## Step 9: Testing and Validation

### 9.1 Run Test Suite

```bash
# Run all tests
npm test

# Run specific test categories
npm test tests/email/
npm test tests/integration/

# Run with coverage
npm run test:coverage
```

### 9.2 End-to-End Testing

```bash
# Test user registration
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "securepassword123",
    "emailBlogUpdates": true,
    "emailThoughtUpdates": true
  }'

# Test notification sending
curl -X POST https://your-domain.com/api/admin/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_token" \
  -d '{
    "action": "send_notification",
    "contentId": "welcome-post",
    "contentType": "blog"
  }'
```

### 9.3 Monitor System Health

```bash
# Check system status
curl https://your-domain.com/api/health

# Check admin dashboard
curl https://your-domain.com/api/admin/notifications \
  -H "Authorization: Bearer your_admin_token"
```

## Step 10: Post-Deployment Setup

### 10.1 Setup Monitoring

1. Configure Cloudflare Analytics
2. Set up email alerts for system failures
3. Configure log aggregation
4. Set up performance monitoring

### 10.2 Create Admin Account

```bash
# Create admin user in production
wrangler d1 execute DB --env=production --command="
INSERT INTO users (email, username, password_hash, email_blog_updates, email_thought_updates, is_admin)
VALUES ('admin@your-domain.com', 'admin', 'your_admin_password_hash', 1, 1, 1);"
```

### 10.3 Initialize Email Templates

```bash
# Access admin panel at https://your-domain.com/admin/notifications
# Initialize default email templates
curl -X POST https://your-domain.com/api/admin/templates/initialize \
  -H "Authorization: Bearer your_admin_token"
```

## Troubleshooting

### Common Issues

#### Gmail API Quota Exceeded
```bash
# Check current quota usage
curl "https://www.googleapis.com/gmail/v1/users/me/profile" \
  -H "Authorization: Bearer your_access_token"

# Solution: Upgrade to paid plan or implement rate limiting
```

#### Database Connection Issues
```bash
# Verify database binding
wrangler d1 list

# Check migration status
wrangler d1 execute DB --env=production --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### Email Delivery Issues
```bash
# Check email logs
wrangler tail --env=production --format=pretty

# Test email configuration
node scripts/test-email-config.js
```

#### Authentication Issues
```bash
# Verify JWT secret
wrangler secret list --env=production

# Test token generation
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
wrangler secret put DEBUG --env=development
# Value: "email:*"

# View debug logs
wrangler tail --env=development --format=pretty
```

### Performance Optimization

```bash
# Monitor performance metrics
curl https://your-domain.com/api/admin/metrics \
  -H "Authorization: Bearer your_admin_token"

# Optimize database queries
wrangler d1 execute DB --env=production --command="EXPLAIN QUERY PLAN SELECT * FROM email_notifications WHERE status = 'pending';"
```

## Security Checklist

### Production Security
- [ ] All secrets are properly set in Wrangler
- [ ] JWT secret is cryptographically secure (32+ characters)
- [ ] Database has proper access controls
- [ ] Email templates are sanitized
- [ ] Rate limiting is configured
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Input validation is implemented
- [ ] Admin access is restricted
- [ ] Logging doesn't expose sensitive data

### Gmail Security
- [ ] OAuth2 credentials are secure
- [ ] Refresh token is protected
- [ ] Sending quotas are monitored
- [ ] Email headers are properly set
- [ ] Unsubscribe links are secure
- [ ] DKIM/SPF records are configured

## Maintenance

### Regular Tasks

```bash
# Weekly: Check system health
curl https://your-domain.com/api/health

# Monthly: Review email metrics
curl https://your-domain.com/api/admin/notifications \
  -H "Authorization: Bearer your_admin_token"

# Quarterly: Update dependencies
npm update
npm audit fix

# Annually: Rotate secrets
wrangler secret put JWT_SECRET --env=production
wrangler secret put CRON_SECRET --env=production
```

### Backup Strategy

```bash
# Backup database
wrangler d1 backup create DB --env=production

# Export email templates
wrangler d1 execute DB --env=production --command="SELECT * FROM email_templates;" --output=json > templates_backup.json

# Backup user preferences
wrangler d1 execute DB --env=production --command="SELECT id, email, email_blog_updates, email_thought_updates, email_announcements FROM users;" --output=json > users_backup.json
```

## Next Steps

After successful deployment:

1. **Configure monitoring and alerting**
2. **Set up automated backups**
3. **Create runbook for common issues**
4. **Train team on admin interface**
5. **Plan for scaling and load testing**
6. **Implement additional features as needed**

## Support

For issues or questions:
- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review the [API Documentation](./API_DOCUMENTATION.md)
- Open an issue on GitHub
- Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Author:** Email Notifications Team