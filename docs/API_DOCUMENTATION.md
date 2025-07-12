# Email Notifications API Documentation

## Overview

The Email Notifications API provides comprehensive endpoints for managing email notifications, user preferences, and system administration. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
https://your-domain.com/api
```

## Authentication

### JWT Authentication
Most endpoints require JWT authentication via the Authorization header:
```http
Authorization: Bearer {jwt_token}
```

### Admin Authentication
Admin endpoints require additional role verification:
```http
Authorization: Bearer {admin_jwt_token}
```

### Cron Authentication
Background processing endpoints use a secret key:
```http
Authorization: Bearer {cron_secret}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## User Endpoints

### Get User Preferences

Retrieve the current user's email notification preferences.

```http
GET /api/user/preferences
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "data": {
    "emailBlogUpdates": true,
    "emailThoughtUpdates": true,
    "emailAnnouncements": false,
    "unsubscribeAll": false,
    "emailVerified": true,
    "emailStatus": "active"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing JWT token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Database error

### Update User Preferences

Update the current user's email notification preferences.

```http
PUT /api/user/preferences
Content-Type: application/json
```

**Authentication:** Required (JWT)

**Request Body:**
```json
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
  "message": "Email preferences updated successfully",
  "data": {
    "emailBlogUpdates": false,
    "emailThoughtUpdates": true,
    "emailAnnouncements": true,
    "unsubscribeAll": false
  }
}
```

**Validation Rules:**
- `emailBlogUpdates`: Boolean (optional)
- `emailThoughtUpdates`: Boolean (optional)
- `emailAnnouncements`: Boolean (optional)

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Database error

### Unsubscribe from Notifications

Unsubscribe a user from email notifications using a secure token.

```http
POST /api/user/unsubscribe
Content-Type: application/json
```

**Authentication:** None (uses secure token)

**Request Body:**
```json
{
  "token": "secure_unsubscribe_token_here",
  "type": "all" // or "blog", "thought", "announcement"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from all notifications",
  "data": {
    "unsubscribeType": "all",
    "remainingPreferences": {
      "emailBlogUpdates": false,
      "emailThoughtUpdates": false,
      "emailAnnouncements": false,
      "unsubscribeAll": true
    }
  }
}
```

**Unsubscribe Types:**
- `all` - Unsubscribe from all notifications
- `blog` - Unsubscribe from blog notifications only
- `thought` - Unsubscribe from thought notifications only
- `announcement` - Unsubscribe from announcement notifications only

**Error Responses:**
- `400 Bad Request` - Invalid or missing token
- `404 Not Found` - Token not found or expired
- `410 Gone` - Token already used
- `500 Internal Server Error` - Database error

## Admin Endpoints

### Get Notification Dashboard

Retrieve comprehensive notification statistics and system status.

```http
GET /api/admin/notifications
```

**Authentication:** Required (Admin JWT)

**Response:**
```json
{
  "success": true,
  "data": {
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
    "recentNotifications": [
      {
        "id": "notif_123",
        "userId": "user_456",
        "userEmail": "user@example.com",
        "username": "user123",
        "contentType": "blog",
        "contentId": "my-blog-post",
        "contentTitle": "My Blog Post",
        "contentUrl": "https://example.com/blog/my-blog-post",
        "status": "sent",
        "createdAt": "2025-01-01T00:00:00Z",
        "sentAt": "2025-01-01T00:01:00Z",
        "errorMessage": null
      }
    ],
    "unnotifiedContent": [
      {
        "id": "content_789",
        "slug": "new-blog-post",
        "contentType": "blog",
        "title": "New Blog Post",
        "publishDate": "2025-01-01T00:00:00Z",
        "notificationSent": false
      }
    ],
    "systemStatus": {
      "overall_status": "healthy",
      "last_updated": "2025-01-01T00:00:00Z"
    }
  }
}
```

**Error Responses:**
- `403 Forbidden` - Admin access required
- `500 Internal Server Error` - System error

### Send Manual Notification

Manually trigger email notifications for specific content.

```http
POST /api/admin/notifications
Content-Type: application/json
```

**Authentication:** Required (Admin JWT)

**Request Body:**
```json
{
  "action": "send_notification",
  "contentId": "blog-post-slug",
  "contentType": "blog",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully for blog: My Blog Post",
  "data": {
    "contentId": "blog-post-slug",
    "contentType": "blog",
    "notificationsSent": 45,
    "notificationsFailed": 0,
    "notificationSent": true
  }
}
```

**Request Parameters:**
- `action`: "send_notification" (required)
- `contentId`: Content slug/ID (required)
- `contentType`: "blog" or "thought" (required)
- `force`: Boolean, send even if already sent (optional, default: false)

**Error Responses:**
- `400 Bad Request` - Invalid request parameters
- `403 Forbidden` - Admin access required
- `404 Not Found` - Content not found
- `409 Conflict` - Notification already sent (when force=false)
- `500 Internal Server Error` - Processing error

### Retry Failed Notifications

Retry all failed notifications that are eligible for retry.

```http
POST /api/admin/notifications
Content-Type: application/json
```

**Authentication:** Required (Admin JWT)

**Request Body:**
```json
{
  "action": "retry_failed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Failed notifications processed for retry",
  "data": {
    "notificationsRetried": 3,
    "notificationsSkipped": 2,
    "notificationsSuccessful": 2,
    "notificationsFailed": 1
  }
}
```

### Get System Status

Retrieve comprehensive system health and monitoring information.

```http
POST /api/admin/notifications
Content-Type: application/json
```

**Authentication:** Required (Admin JWT)

**Request Body:**
```json
{
  "action": "get_stats"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 150,
      "sent": 140,
      "failed": 8,
      "pending": 2,
      "retryable": 5
    },
    "systemStatus": {
      "overall_status": "healthy",
      "metrics": {
        "total_notifications": 150,
        "sent_notifications": 140,
        "failed_notifications": 8,
        "pending_notifications": 2,
        "avg_delivery_time": 2.5,
        "success_rate": 93.33,
        "bounce_rate": 5.33,
        "unsubscribe_rate": 2.0,
        "last_24h_sent": 25,
        "last_24h_failed": 1
      },
      "health_checks": [
        {
          "service": "database",
          "status": "healthy",
          "message": "Database connection is working",
          "timestamp": "2025-01-01T00:00:00Z"
        },
        {
          "service": "email_service",
          "status": "healthy",
          "message": "Email service is operational",
          "timestamp": "2025-01-01T00:00:00Z"
        }
      ],
      "alerts": [
        {
          "id": "high_bounce_rate_1234567890",
          "type": "warning",
          "title": "High Email Bounce Rate",
          "message": "Bounce rate is 12.50%, which exceeds the 10% threshold",
          "threshold": 10,
          "current_value": 12.5,
          "timestamp": "2025-01-01T00:00:00Z"
        }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  }
}
```

## Background Processing Endpoints

### Process Notifications (Cron)

Process pending notifications and handle retries. This endpoint is typically called by a cron job.

```http
POST /api/cron/process-notifications
```

**Authentication:** Required (Cron Secret)

**Response:**
```json
{
  "success": true,
  "message": "Notification processing completed",
  "data": {
    "processed": 15,
    "successful": 14,
    "failed": 1,
    "retried": 3,
    "duration": 2.5,
    "nextRun": "2025-01-01T01:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid cron secret
- `500 Internal Server Error` - Processing error

## Authentication Endpoints

### Login

Authenticate user and receive JWT token.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "user123",
      "emailBlogUpdates": true,
      "emailThoughtUpdates": true,
      "emailAnnouncements": false
    }
  }
}
```

### Logout

Invalidate current JWT token.

```http
POST /api/auth/logout
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

Get current user information.

```http
GET /api/auth/me
```

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "user123",
    "emailBlogUpdates": true,
    "emailThoughtUpdates": true,
    "emailAnnouncements": false,
    "unsubscribeAll": false,
    "emailVerified": true,
    "emailStatus": "active"
  }
}
```

### Registration

Register new user account.

```http
POST /api/auth/signup
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "user123",
  "password": "secure_password",
  "emailBlogUpdates": true,
  "emailThoughtUpdates": true,
  "emailAnnouncements": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "user123",
      "emailBlogUpdates": true,
      "emailThoughtUpdates": true,
      "emailAnnouncements": false
    }
  },
  "message": "Account created successfully"
}
```

## Error Codes

### General Error Codes
- `INVALID_REQUEST` - Malformed request
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `INTERNAL_ERROR` - Internal server error

### Email-Specific Error Codes
- `EMAIL_QUOTA_EXCEEDED` - Gmail API quota exceeded
- `EMAIL_INVALID_RECIPIENT` - Invalid email address
- `EMAIL_BOUNCE` - Email bounced
- `EMAIL_RATE_LIMIT` - Email rate limit exceeded
- `EMAIL_AUTH_ERROR` - Gmail authentication failed
- `EMAIL_TEMPLATE_ERROR` - Template rendering failed
- `EMAIL_SEND_ERROR` - Email sending failed

### Token Error Codes
- `TOKEN_INVALID` - Invalid token
- `TOKEN_EXPIRED` - Token expired
- `TOKEN_ALREADY_USED` - Token already used
- `TOKEN_NOT_FOUND` - Token not found

## Rate Limiting

All endpoints have rate limiting to prevent abuse:

- **User Endpoints**: 100 requests per minute per user
- **Admin Endpoints**: 200 requests per minute per admin
- **Public Endpoints**: 50 requests per minute per IP
- **Cron Endpoints**: 10 requests per minute

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Webhooks

### Email Event Webhooks

Receive notifications about email events (bounces, deliveries, etc.):

```http
POST /api/webhooks/email-events
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "bounce",
  "messageId": "gmail_message_id",
  "recipient": "user@example.com",
  "timestamp": "2025-01-01T00:00:00Z",
  "details": {
    "bounceType": "permanent",
    "bounceReason": "mailbox_full"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const EmailAPI = require('./email-api-client');

const client = new EmailAPI({
  baseURL: 'https://your-domain.com/api',
  token: 'your_jwt_token'
});

// Update user preferences
await client.updatePreferences({
  emailBlogUpdates: false,
  emailThoughtUpdates: true
});

// Send manual notification (admin)
await client.sendNotification({
  contentId: 'blog-post-slug',
  contentType: 'blog'
});
```

### curl Examples

```bash
# Get user preferences
curl -X GET \
  https://your-domain.com/api/user/preferences \
  -H "Authorization: Bearer your_jwt_token"

# Update preferences
curl -X PUT \
  https://your-domain.com/api/user/preferences \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"emailBlogUpdates": false}'

# Unsubscribe
curl -X POST \
  https://your-domain.com/api/user/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token": "secure_token_here"}'
```

## Testing

### Test Endpoints

Development and testing endpoints (not available in production):

```http
POST /api/test/send-sample-email
POST /api/test/generate-test-notifications
POST /api/test/simulate-bounce
```

### Postman Collection

Import the Postman collection for easy API testing:
[Download Postman Collection](./postman/email-api.postman_collection.json)

## Monitoring

### Health Check Endpoint

Check API health and status:

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z",
  "checks": {
    "database": "healthy",
    "email_service": "healthy",
    "queue": "healthy"
  }
}
```

### Metrics Endpoint

Get API metrics (admin only):

```http
GET /api/metrics
```

**Response:**
```json
{
  "requests_total": 1000,
  "requests_success": 950,
  "requests_error": 50,
  "avg_response_time": 120,
  "endpoints": {
    "/api/user/preferences": {
      "requests": 500,
      "avg_time": 80
    }
  }
}
```

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Contact:** support@your-domain.com