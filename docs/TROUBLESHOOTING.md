# Email Notifications System - Troubleshooting Guide

## Overview

This guide provides solutions to common issues you might encounter with the email notifications system, including Gmail API problems, database issues, deployment failures, and performance problems.

## Quick Diagnostics

### System Health Check

```bash
# Check overall system status
curl https://your-domain.com/api/health

# Check admin dashboard
curl https://your-domain.com/api/admin/notifications \
  -H "Authorization: Bearer your_admin_token"

# Check database connectivity
wrangler d1 execute DB --env=production --command="SELECT 1;"

# Check recent logs
wrangler tail --env=production --format=pretty
```

### Common Diagnostic Commands

```bash
# Check deployment status
wrangler deployments list --env=production

# Verify secrets are set
wrangler secret list --env=production

# Check database tables
wrangler d1 execute DB --env=production --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check notification queue
wrangler d1 execute DB --env=production --command="SELECT status, COUNT(*) FROM email_notifications GROUP BY status;"
```

## Gmail API Issues

### Error: "Daily sending quota exceeded"

**Symptoms:**
- Emails not being sent
- Error message: "Daily sending quota exceeded"
- High failure rate in admin dashboard

**Causes:**
- Exceeded Gmail API daily sending limit (100 emails/day for free accounts)
- Exceeded per-minute rate limit (2 emails/minute for free accounts)

**Solutions:**

1. **Upgrade Gmail Account**
   ```bash
   # Check current quota usage
   curl "https://www.googleapis.com/gmail/v1/users/me/profile" \
     -H "Authorization: Bearer your_access_token"
   
   # Upgrade to Google Workspace for higher limits
   # - Up to 2,000 emails/day
   # - 1,000 emails/day for trial accounts
   ```

2. **Implement Rate Limiting**
   ```javascript
   // Update notification service batch size
   const batchSize = 2; // Reduce from 10 to 2 for free accounts
   const delayBetweenBatches = 60000; // 1 minute delay
   ```

3. **Monitor Quota Usage**
   ```bash
   # Set up quota monitoring
   curl -X POST https://your-domain.com/api/admin/notifications \
     -H "Authorization: Bearer your_admin_token" \
     -d '{"action": "check_quota"}'
   ```

### Error: "Invalid credentials"

**Symptoms:**
- All email sending fails
- Error message: "Invalid credentials" or "Authentication failed"
- Gmail API returns 401 errors

**Causes:**
- Expired or invalid refresh token
- Incorrect client ID/secret
- OAuth2 consent screen not configured

**Solutions:**

1. **Regenerate Refresh Token**
   ```bash
   # Go to OAuth 2.0 Playground
   # https://developers.google.com/oauthplayground
   
   # Select Gmail API scope
   # Get new refresh token
   
   # Update the secret
   wrangler secret put GMAIL_REFRESH_TOKEN --env=production
   ```

2. **Verify OAuth2 Configuration**
   ```bash
   # Check OAuth consent screen
   # Visit Google Cloud Console > APIs & Services > OAuth consent screen
   
   # Ensure app is published or add test users
   ```

3. **Test Credentials**
   ```bash
   # Create test script
   cat > test-gmail-auth.js << 'EOF'
   const https = require('https');
   
   const testAuth = async (clientId, clientSecret, refreshToken) => {
     // Test implementation here
   };
   
   testAuth(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, process.env.GMAIL_REFRESH_TOKEN);
   EOF
   
   node test-gmail-auth.js
   ```

### Error: "Recipient address rejected"

**Symptoms:**
- Specific emails fail to send
- Error message contains "recipient address rejected"
- User email appears invalid

**Causes:**
- Invalid email format
- Recipient email server blocking
- Sender reputation issues

**Solutions:**

1. **Validate Email Addresses**
   ```javascript
   // Add email validation
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     throw new Error('Invalid email format');
   }
   ```

2. **Check Email Status**
   ```bash
   # Check user email status
   wrangler d1 execute DB --env=production --command="
   SELECT email, email_status, email_verified 
   FROM users 
   WHERE email = 'problematic@example.com';"
   ```

3. **Update Email Status**
   ```bash
   # Mark email as bounced
   wrangler d1 execute DB --env=production --command="
   UPDATE users 
   SET email_status = 'bounced' 
   WHERE email = 'problematic@example.com';"
   ```

## Database Issues

### Error: "Database connection failed"

**Symptoms:**
- All API endpoints return 500 errors
- Error message: "Database connection failed"
- Cannot access admin dashboard

**Causes:**
- D1 database binding not configured
- Database doesn't exist
- Network connectivity issues

**Solutions:**

1. **Verify Database Binding**
   ```bash
   # Check wrangler.toml configuration
   cat wrangler.toml | grep -A 5 "d1_databases"
   
   # Verify database exists
   wrangler d1 list
   ```

2. **Check Database Configuration**
   ```bash
   # Test database connection
   wrangler d1 execute DB --env=production --command="SELECT 1;"
   
   # If fails, check database ID
   wrangler d1 info DB --env=production
   ```

3. **Recreate Database Binding**
   ```bash
   # Delete and recreate database
   wrangler d1 delete email-notifications-db
   wrangler d1 create email-notifications-db
   
   # Update wrangler.toml with new database ID
   # Re-run migrations
   ```

### Error: "Table doesn't exist"

**Symptoms:**
- Specific database operations fail
- Error message: "no such table: email_notifications"
- Missing table errors in logs

**Causes:**
- Migrations not run
- Incomplete migration execution
- Database schema mismatch

**Solutions:**

1. **Check Existing Tables**
   ```bash
   # List all tables
   wrangler d1 execute DB --env=production --command="
   SELECT name FROM sqlite_master WHERE type='table';"
   ```

2. **Run Missing Migrations**
   ```bash
   # Run all migrations in order
   for file in migrations/*.sql; do
     echo "Running $file..."
     wrangler d1 execute DB --env=production --file="$file"
   done
   ```

3. **Verify Schema**
   ```bash
   # Check specific table schema
   wrangler d1 execute DB --env=production --command="
   SELECT sql FROM sqlite_master WHERE name='email_notifications';"
   ```

### Error: "Foreign key constraint failed"

**Symptoms:**
- Insert/update operations fail
- Error message contains "FOREIGN KEY constraint failed"
- Data integrity issues

**Causes:**
- Referenced record doesn't exist
- Orphaned records
- Schema inconsistencies

**Solutions:**

1. **Check Foreign Key Constraints**
   ```bash
   # Check constraint violations
   wrangler d1 execute DB --env=production --command="
   SELECT * FROM email_notifications 
   WHERE user_id NOT IN (SELECT id FROM users);"
   ```

2. **Fix Orphaned Records**
   ```bash
   # Remove orphaned notifications
   wrangler d1 execute DB --env=production --command="
   DELETE FROM email_notifications 
   WHERE user_id NOT IN (SELECT id FROM users);"
   ```

3. **Verify Data Integrity**
   ```bash
   # Check all foreign key relationships
   wrangler d1 execute DB --env=production --command="PRAGMA foreign_key_check;"
   ```

## Authentication Issues

### Error: "JWT token invalid"

**Symptoms:**
- API calls return 401 Unauthorized
- Admin dashboard inaccessible
- Error message: "JWT token invalid"

**Causes:**
- Expired JWT token
- Invalid JWT secret
- Token malformed

**Solutions:**

1. **Check JWT Secret**
   ```bash
   # Verify JWT secret is set
   wrangler secret list --env=production | grep JWT_SECRET
   
   # Regenerate if needed
   wrangler secret put JWT_SECRET --env=production
   ```

2. **Validate Token**
   ```bash
   # Test token generation
   curl -X POST https://your-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password"}'
   ```

3. **Check Token Expiration**
   ```javascript
   // Decode JWT token to check expiration
   const jwt = require('jsonwebtoken');
   const token = 'your_jwt_token_here';
   const decoded = jwt.decode(token);
   console.log('Token expires at:', new Date(decoded.exp * 1000));
   ```

### Error: "Admin access required"

**Symptoms:**
- Admin endpoints return 403 Forbidden
- Error message: "Admin access required"
- Cannot access admin dashboard

**Causes:**
- User doesn't have admin privileges
- Admin check logic incorrect
- Missing admin flag in database

**Solutions:**

1. **Grant Admin Access**
   ```bash
   # Add admin flag to user
   wrangler d1 execute DB --env=production --command="
   UPDATE users 
   SET is_admin = 1 
   WHERE email = 'your_email@example.com';"
   ```

2. **Verify Admin Status**
   ```bash
   # Check user admin status
   wrangler d1 execute DB --env=production --command="
   SELECT email, username, is_admin 
   FROM users 
   WHERE email = 'your_email@example.com';"
   ```

3. **Update Admin Logic**
   ```javascript
   // Check admin authentication logic
   // Ensure proper admin validation in /api/admin/notifications.ts
   ```

## Email Delivery Issues

### Error: "Email not being sent"

**Symptoms:**
- Notifications appear as sent but not received
- No error messages in logs
- Admin dashboard shows successful sends

**Causes:**
- Email going to spam folder
- Incorrect sender email
- Email template issues

**Solutions:**

1. **Check Email Headers**
   ```bash
   # View email message details
   curl https://your-domain.com/api/admin/email-details/{messageId} \
     -H "Authorization: Bearer your_admin_token"
   ```

2. **Verify Sender Email**
   ```bash
   # Check sender email configuration
   wrangler secret list --env=production | grep GMAIL_FROM_EMAIL
   
   # Test with different sender
   wrangler secret put GMAIL_FROM_EMAIL --env=production
   ```

3. **Test Email Templates**
   ```bash
   # Send test email
   curl -X POST https://your-domain.com/api/admin/test-email \
     -H "Authorization: Bearer your_admin_token" \
     -d '{"recipient": "your_email@example.com", "template": "blog_notification"}'
   ```

### Error: "High bounce rate"

**Symptoms:**
- Alert: "High Email Bounce Rate"
- Many emails marked as failed
- Delivery rate below 90%

**Causes:**
- Invalid email addresses
- Sender reputation issues
- Email server blocking

**Solutions:**

1. **Clean Email List**
   ```bash
   # Find bounced emails
   wrangler d1 execute DB --env=production --command="
   SELECT email, email_status 
   FROM users 
   WHERE email_status = 'bounced';"
   
   # Remove bounced emails from notifications
   wrangler d1 execute DB --env=production --command="
   UPDATE users 
   SET email_blog_updates = 0, email_thought_updates = 0, email_announcements = 0 
   WHERE email_status = 'bounced';"
   ```

2. **Verify Email Addresses**
   ```bash
   # Implement email verification
   curl -X POST https://your-domain.com/api/admin/verify-emails \
     -H "Authorization: Bearer your_admin_token"
   ```

3. **Monitor Reputation**
   ```bash
   # Check sender reputation
   # Use tools like MX Toolbox or Mail Tester
   ```

## Performance Issues

### Error: "Slow email processing"

**Symptoms:**
- Long delays in email delivery
- Timeout errors
- High processing times in logs

**Causes:**
- Large batch sizes
- Inefficient database queries
- Network latency

**Solutions:**

1. **Optimize Batch Processing**
   ```javascript
   // Reduce batch size
   const batchSize = 5; // Reduce from 10
   const delayBetweenBatches = 3000; // Increase delay
   ```

2. **Optimize Database Queries**
   ```bash
   # Analyze slow queries
   wrangler d1 execute DB --env=production --command="
   EXPLAIN QUERY PLAN 
   SELECT * FROM email_notifications 
   WHERE status = 'pending' 
   ORDER BY created_at;"
   
   # Add indexes if needed
   wrangler d1 execute DB --env=production --command="
   CREATE INDEX idx_notifications_status_created 
   ON email_notifications(status, created_at);"
   ```

3. **Monitor Performance**
   ```bash
   # Check performance metrics
   curl https://your-domain.com/api/admin/performance \
     -H "Authorization: Bearer your_admin_token"
   ```

### Error: "Memory limit exceeded"

**Symptoms:**
- Worker crashes with memory errors
- Intermittent failures
- Performance degradation

**Causes:**
- Memory leaks
- Large data sets
- Inefficient processing

**Solutions:**

1. **Optimize Memory Usage**
   ```javascript
   // Process in smaller chunks
   const chunkSize = 100; // Reduce data processing size
   
   // Clean up variables
   let processedUsers = null;
   processedUsers = undefined;
   ```

2. **Use Streaming**
   ```javascript
   // Stream large datasets
   const stream = await db.prepare('SELECT * FROM users').stream();
   for await (const user of stream) {
     // Process one user at a time
   }
   ```

3. **Monitor Memory Usage**
   ```bash
   # Check memory usage
   wrangler tail --env=production --format=pretty | grep -i memory
   ```

## Deployment Issues

### Error: "Deployment failed"

**Symptoms:**
- wrangler deploy fails
- Build errors
- Runtime errors after deployment

**Causes:**
- Build configuration issues
- Missing dependencies
- Environment variable issues

**Solutions:**

1. **Check Build Process**
   ```bash
   # Clean build
   rm -rf dist/ node_modules/
   npm install
   npm run build
   
   # Check build output
   ls -la dist/
   ```

2. **Verify Dependencies**
   ```bash
   # Check package.json
   npm ls
   
   # Update dependencies
   npm update
   npm audit fix
   ```

3. **Test Locally**
   ```bash
   # Test local deployment
   npm run dev
   
   # Test production build locally
   npm run preview
   ```

### Error: "Environment variables not set"

**Symptoms:**
- Runtime errors about missing environment variables
- Functionality not working after deployment
- Configuration errors

**Causes:**
- Secrets not set in Wrangler
- Environment variable name mismatch
- Wrong environment configuration

**Solutions:**

1. **Verify All Secrets**
   ```bash
   # Check all required secrets
   wrangler secret list --env=production
   
   # Required secrets:
   # - GMAIL_CLIENT_ID
   # - GMAIL_CLIENT_SECRET
   # - GMAIL_REFRESH_TOKEN
   # - GMAIL_FROM_EMAIL
   # - JWT_SECRET
   # - CRON_SECRET
   ```

2. **Set Missing Secrets**
   ```bash
   # Set each required secret
   wrangler secret put GMAIL_CLIENT_ID --env=production
   wrangler secret put GMAIL_CLIENT_SECRET --env=production
   wrangler secret put GMAIL_REFRESH_TOKEN --env=production
   wrangler secret put GMAIL_FROM_EMAIL --env=production
   wrangler secret put JWT_SECRET --env=production
   wrangler secret put CRON_SECRET --env=production
   ```

3. **Test Environment Variables**
   ```bash
   # Test configuration
   curl https://your-domain.com/api/config/test \
     -H "Authorization: Bearer your_admin_token"
   ```

## Monitoring and Debugging

### Enable Debug Logging

```bash
# Set debug mode
wrangler secret put DEBUG --env=production
# Value: "email:*,db:*,auth:*"

# View logs
wrangler tail --env=production --format=pretty
```

### Performance Monitoring

```bash
# Check performance metrics
curl https://your-domain.com/api/admin/metrics \
  -H "Authorization: Bearer your_admin_token"

# Monitor queue size
curl https://your-domain.com/api/admin/queue-status \
  -H "Authorization: Bearer your_admin_token"
```

### Health Checks

```bash
# Comprehensive health check
curl https://your-domain.com/api/health

# Detailed system status
curl https://your-domain.com/api/admin/system-status \
  -H "Authorization: Bearer your_admin_token"
```

## Emergency Procedures

### System Down

1. **Check System Status**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Check Recent Deployments**
   ```bash
   wrangler deployments list --env=production
   ```

3. **Rollback if Needed**
   ```bash
   # Roll back to previous version
   wrangler rollback --env=production
   ```

### Database Corruption

1. **Backup Current State**
   ```bash
   # Create backup
   wrangler d1 backup create DB --env=production
   ```

2. **Restore from Backup**
   ```bash
   # List available backups
   wrangler d1 backup list DB --env=production
   
   # Restore from backup
   wrangler d1 backup restore DB --env=production --backup-id=backup_id
   ```

### Email Service Outage

1. **Check Service Status**
   ```bash
   # Test Gmail API
   curl "https://www.googleapis.com/gmail/v1/users/me/profile" \
     -H "Authorization: Bearer your_access_token"
   ```

2. **Enable Circuit Breaker**
   ```bash
   # Circuit breaker will automatically engage after 5 failures
   # Monitor status
   curl https://your-domain.com/api/admin/circuit-breaker \
     -H "Authorization: Bearer your_admin_token"
   ```

3. **Queue Management**
   ```bash
   # Check queue size
   wrangler d1 execute DB --env=production --command="
   SELECT status, COUNT(*) as count 
   FROM email_notifications 
   GROUP BY status;"
   
   # Pause processing if needed
   wrangler secret put PAUSE_EMAIL_PROCESSING --env=production
   # Value: "true"
   ```

## Getting Help

### Support Channels

1. **Documentation**
   - [Setup Guide](./SETUP_GUIDE.md)
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Email System README](./EMAIL_SYSTEM_README.md)

2. **Community Support**
   - GitHub Issues
   - Stack Overflow (tag: cloudflare-workers)
   - Cloudflare Community

3. **Professional Support**
   - Cloudflare Enterprise Support
   - Google Cloud Support

### Gathering Information for Support

When reporting issues, include:

```bash
# System information
wrangler --version
node --version
npm --version

# Environment details
wrangler whoami
wrangler deployments list --env=production

# Error logs
wrangler tail --env=production --format=pretty > error_logs.txt

# Configuration (remove sensitive data)
cat wrangler.toml
wrangler secret list --env=production

# Database status
wrangler d1 execute DB --env=production --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Emergency Contact:** support@your-domain.com