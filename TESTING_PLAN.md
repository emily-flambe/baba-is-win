# Single Notification Test Plan - Root Cause Analysis

This document outlines a systematic testing approach to isolate and identify the root cause of email notification failures in your system.

## Overview

The email notification pipeline consists of several components that must work together:

1. **Environment Configuration** - OAuth credentials, site settings
2. **Database Operations** - User retrieval, notification tracking
3. **Content Processing** - Blog posts, thoughts formatting
4. **Template Rendering** - HTML/text email generation
5. **Unsubscribe Service** - Token generation and URLs
6. **Gmail Authentication** - OAuth token refresh and API access
7. **Email Sending** - Gmail API message delivery
8. **Status Updates** - Database notification tracking

## Test Scripts

### Primary Test Script: `test-single-notification.js`

A focused, executable test that validates each component step-by-step:

```bash
# 1. Update test configuration in the script
# 2. Set environment variables
# 3. Run the test
node test-single-notification.js
```

**Key Features:**
- Step-by-step validation with pause points
- Color-coded output for easy issue identification
- Specific error diagnosis and solutions
- Option to send real test emails or simulate
- Comprehensive final report with root cause analysis

### Comprehensive Test Script: `debug-single-notification.js`

A detailed testing framework with extensive logging and validation.

## Test Configuration

Before running tests, update the `TEST_CONFIG` object:

```javascript
const TEST_CONFIG = {
  // CRITICAL: Update these with real values
  TEST_USER_EMAIL: 'your-actual-test-email@example.com',
  TEST_USER_ID: 'real_user_id_from_database',
  CONTENT_TYPE: 'blog', // or 'thought'
  
  // Test content
  TEST_CONTENT: {
    slug: 'debug-test-post',
    title: 'Debug Test: Email Notification System',
    description: 'Test description for debugging',
    content: 'Test content body',
    publishDate: new Date(),
    tags: ['debug', 'test'],
    filePath: '/test/debug-post.md'
  },
  
  // Options
  SEND_REAL_EMAIL: false,  // Set true for actual email test
  VERBOSE: true,
  STEP_BY_STEP: true
};
```

## Environment Variables Required

Ensure these environment variables are set:

```bash
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_SENDER_EMAIL=your_authorized_sender_email
SITE_NAME="Your Site Name"
SITE_URL=https://yoursite.com
DATABASE_URL=your_database_connection_string
```

## Systematic Testing Approach

### Phase 1: Component Isolation

Test each component independently to identify the failure point:

#### 1. Environment Validation
- ✅ All required environment variables present
- ✅ Gmail OAuth credentials format validation
- ✅ Site URL format verification

**Potential Issues:**
- Missing environment variables
- Incorrect OAuth credential format
- Invalid site URL format

#### 2. Gmail Authentication
- ✅ Access token refresh successful
- ✅ Gmail API connectivity test
- ✅ Sender email authorization

**Potential Issues:**
- Expired refresh token (requires re-authorization)
- Invalid client ID/secret
- Gmail API not enabled
- Insufficient OAuth scopes

#### 3. Template Rendering
- ✅ Template variable interpolation
- ✅ HTML/text content generation
- ✅ Content length validation

**Potential Issues:**
- Missing template variables
- Template syntax errors
- Content encoding issues

#### 4. Email Construction
- ✅ RFC 2822 email format
- ✅ MIME multipart structure
- ✅ Base64 encoding for Gmail API

**Potential Issues:**
- Invalid email format
- Encoding errors
- MIME structure problems

#### 5. Email Sending
- ✅ Gmail API message sending
- ✅ Response validation
- ✅ Message ID generation

**Potential Issues:**
- Rate limiting (429 errors)
- Permission errors (403 errors)
- Invalid recipient (400 errors)
- Authentication failures (401 errors)

### Phase 2: Database Integration

Validate database operations (requires live database):

#### 1. User Retrieval
```sql
-- Test user exists and has correct preferences
SELECT id, email, username, email_blog_updates, email_thought_updates, 
       email_announcements, email_status, unsubscribe_all, email_verified
FROM users 
WHERE email = 'test@example.com';
```

#### 2. Notification Creation
```sql
-- Check notification records are created
SELECT id, user_id, content_type, content_id, status, created_at
FROM email_notifications 
WHERE user_id = 'test_user_id'
ORDER BY created_at DESC;
```

#### 3. Status Updates
```sql
-- Verify notification status updates
SELECT id, status, sent_at, email_message_id, error_message, retry_count
FROM email_notifications 
WHERE id = 'test_notification_id';
```

### Phase 3: End-to-End Testing

Test complete notification flow:

#### 1. Single User, Single Content
- Create test blog post/thought
- Trigger notification for one user
- Verify email delivery
- Check database updates

#### 2. Batch Processing
- Test with multiple users
- Verify rate limiting handling
- Check error recovery mechanisms

#### 3. Error Scenarios
- Invalid email addresses
- Network connectivity issues
- Database connection failures
- Gmail API quota limits

## Common Root Causes & Solutions

### 1. Gmail Authentication Issues

**Symptoms:**
- 401 Unauthorized errors
- Token refresh failures
- "invalid_grant" errors

**Solutions:**
- Re-run OAuth flow to get fresh refresh token
- Verify client ID/secret in Google Cloud Console
- Check Gmail API is enabled
- Ensure OAuth scopes include Gmail send permission

### 2. Database Connection Problems

**Symptoms:**
- User not found errors
- Database connection timeouts
- Missing notification records

**Solutions:**
- Verify database connection string
- Check network connectivity to database
- Validate user data in database
- Ensure proper table schemas

### 3. Email Format Issues

**Symptoms:**
- 400 Bad Request from Gmail API
- Malformed email errors
- Encoding problems

**Solutions:**
- Validate RFC 2822 email format
- Check MIME structure
- Verify Base64 encoding
- Test with simple plain text first

### 4. Rate Limiting

**Symptoms:**
- 429 Too Many Requests errors
- Intermittent sending failures
- Quota exceeded messages

**Solutions:**
- Implement proper rate limiting
- Add delays between batch sends
- Monitor Gmail API quotas
- Consider alternative email providers for high volume

### 5. Content Processing Errors

**Symptoms:**
- Template rendering failures
- Missing content variables
- HTML encoding issues

**Solutions:**
- Validate content structure
- Check template variable interpolation
- Sanitize HTML content properly
- Test with minimal content first

## Test Execution Checklist

### Pre-Test Setup
- [ ] Environment variables configured
- [ ] Test user exists in database with correct preferences
- [ ] Gmail OAuth credentials are valid
- [ ] Test content data prepared

### Test Execution
- [ ] Run environment validation
- [ ] Test Gmail authentication
- [ ] Validate template rendering
- [ ] Test email sending (simulated first)
- [ ] Verify database operations
- [ ] Run end-to-end test with real email

### Post-Test Analysis
- [ ] Review test results and error messages
- [ ] Identify root cause from failure point
- [ ] Implement fixes for identified issues
- [ ] Re-run tests to verify fixes
- [ ] Document findings and solutions

## Debugging Tools

### 1. Gmail API Explorer
Test Gmail API calls directly:
https://developers.google.com/gmail/api/v1/reference/users/messages/send

### 2. OAuth 2.0 Playground
Test and refresh OAuth tokens:
https://developers.google.com/oauthplayground/

### 3. Database Query Tools
Direct database access to verify data:
- User preferences
- Notification records
- Content items
- Unsubscribe tokens

### 4. Email Header Analysis
For delivered emails, check:
- Message-ID matching
- DKIM/SPF validation
- Delivery timestamps
- Bounce/delivery reports

## Monitoring Recommendations

After identifying and fixing issues:

### 1. Production Monitoring
- Gmail API response codes and error rates
- Email delivery success/failure rates
- Database query performance
- OAuth token refresh success

### 2. Alerting
- Failed notification batches
- High error rates
- Quota limit approaches
- Database connectivity issues

### 3. Logging
- Detailed error messages with context
- Performance metrics for each component
- User-specific debugging information
- Retry attempt tracking

## Next Steps

1. **Run Initial Test:** Execute `test-single-notification.js` with your configuration
2. **Identify Root Cause:** Use test results to pinpoint the exact failure
3. **Implement Fix:** Address the specific issue identified
4. **Verify Solution:** Re-run tests to confirm fix
5. **Production Testing:** Test in production environment with monitoring
6. **Documentation:** Update documentation with findings and solutions

This systematic approach will help you quickly identify and resolve the email notification issues in your system.