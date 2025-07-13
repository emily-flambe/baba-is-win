# Email Notifications API Implementation - Detailed Documentation

## Overview

This document provides comprehensive technical documentation for the email notifications API implementation in the Astro/Cloudflare Workers application. The API layer handles user preferences, unsubscribe functionality, administrative management, and background processing for email notifications.

## API Architecture Overview

### Request/Response Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   API Routes    │    │   Services      │
│   (Frontend)    │◄──►│   (Astro)       │◄──►│   (Business)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Middleware    │    │   Database      │
                       │   (Auth/JWT)    │    │   (D1/SQLite)   │
                       └─────────────────┘    └─────────────────┘
```

### Core Components

1. **API Routes** (`src/pages/api/`): RESTful endpoints handling HTTP requests
2. **Authentication Middleware**: JWT-based authentication and authorization
3. **Database Layer** (`AuthDB`): Data access and persistence
4. **Service Layer**: Business logic and external integrations
5. **Error Handling**: Standardized error responses and logging

### Authentication Pattern

All user-facing endpoints use JWT token authentication via HTTP-only cookies:

```typescript
// Common authentication pattern
async function getUserFromToken(request: Request, env: any): Promise<any> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];

  if (!token) return null;

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;

  const db = new AuthDB(env.DB);
  return await db.getUserById(payload.sub);
}
```

## User Preferences API

### Endpoint: `/api/user/preferences`

**File**: `src/pages/api/user/preferences.ts`

#### GET /api/user/preferences

Retrieves current user's email preferences.

**Authentication**: Required (JWT token)

**Request Headers**:
```
Cookie: auth-token=<jwt_token>
```

**Response Schema**:
```typescript
interface PreferencesResponse {
  preferences: {
    emailBlogUpdates: boolean;
    emailThoughtUpdates: boolean;
    emailAnnouncements: boolean;
    emailFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  }
}
```

**Success Response** (200):
```json
{
  "preferences": {
    "emailBlogUpdates": true,
    "emailThoughtUpdates": false,
    "emailAnnouncements": true,
    "emailFrequency": "immediate"
  }
}
```

**Error Responses**:
- 401: Not authenticated
- 500: Failed to fetch preferences

#### PUT /api/user/preferences

Updates user's email preferences.

**Authentication**: Required (JWT token)

**Request Body**:
```typescript
interface UpdatePreferencesRequest {
  preferences: {
    emailBlogUpdates: boolean;
    emailThoughtUpdates: boolean;
    emailAnnouncements: boolean;
    emailFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  }
}
```

**Validation Rules**:
- All boolean fields are coerced to boolean values
- `emailFrequency` must be one of: 'immediate', 'daily', 'weekly', 'monthly'
- Invalid frequency returns 400 error

**Success Response** (200):
```json
{
  "message": "Preferences updated successfully",
  "preferences": {
    "emailBlogUpdates": true,
    "emailThoughtUpdates": false,
    "emailAnnouncements": true,
    "emailFrequency": "weekly"
  }
}
```

**Error Responses**:
- 400: Invalid preferences data or invalid email frequency
- 401: Not authenticated
- 500: Failed to update preferences

**Implementation Details**:
```typescript
// Input validation
const validatedPreferences: EmailPreferences = {
  emailBlogUpdates: Boolean(preferences.emailBlogUpdates),
  emailThoughtUpdates: Boolean(preferences.emailThoughtUpdates),
  emailAnnouncements: Boolean(preferences.emailAnnouncements),
  emailFrequency: preferences.emailFrequency || 'immediate'
};

// Frequency validation
const validFrequencies = ['immediate', 'daily', 'weekly', 'monthly'];
if (!validFrequencies.includes(validatedPreferences.emailFrequency)) {
  return new Response(
    JSON.stringify({ error: 'Invalid email frequency' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## Unsubscribe API

### Endpoint: `/api/user/unsubscribe`

**File**: `src/pages/api/user/unsubscribe.ts`

#### POST /api/user/unsubscribe

Processes unsubscribe requests using secure tokens.

**Authentication**: Not required (uses secure token)

**Request Body**:
```typescript
interface UnsubscribeRequest {
  token: string;
}
```

**Security Features**:
- Cryptographically secure tokens
- Token expiration (1 year default)
- Single-use tokens
- IP address and user agent tracking
- Audit logging

**Success Response** (200):
```json
{
  "message": "Successfully unsubscribed from all email notifications",
  "user": {
    "email": "user@example.com",
    "username": "username"
  },
  "tokenType": "one_click",
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**:
- 400: Invalid or missing token, expired token, or processing error
- 500: Failed to process unsubscribe request

**Implementation Flow**:
1. Validate token format and presence
2. Check token validity in database
3. Extract IP address from headers (Cloudflare-aware)
4. Process unsubscribe through service layer
5. Mark token as used
6. Log action for audit trail
7. Return confirmation with user details

**IP Address Extraction**:
```typescript
const ipAddress = request.headers.get('cf-connecting-ip') || 
                 request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 undefined;
```

## Admin Management API

### Endpoint: `/api/admin/notifications`

**File**: `src/pages/api/admin/notifications.ts`

#### GET /api/admin/notifications

Retrieves comprehensive notification analytics and management data.

**Authentication**: Required (Admin JWT token)

**Admin Verification**:
```typescript
// Current simplified admin check (should be enhanced)
if (!user || (!user.email.includes('admin') && !user.username.includes('admin'))) {
  return null;
}
```

**Response Schema**:
```typescript
interface AdminNotificationsResponse {
  stats: NotificationStats;
  recentNotifications: NotificationSummary[];
  unnotifiedContent: ContentSummary[];
  subscriberStats: SubscriberStats;
}
```

**Success Response** (200):
```json
{
  "stats": {
    "total": 1250,
    "pending": 15,
    "sent": 1200,
    "failed": 35,
    "retryable": 20
  },
  "recentNotifications": [
    {
      "id": "notif_123",
      "userId": "user_456",
      "userEmail": "user@example.com",
      "username": "username",
      "contentType": "blog",
      "contentId": "my-blog-post",
      "contentTitle": "My Blog Post",
      "contentUrl": "https://site.com/blog/my-blog-post",
      "status": "sent",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "sentAt": "2024-01-15T10:05:00.000Z",
      "errorMessage": null
    }
  ],
  "unnotifiedContent": [
    {
      "id": "content_789",
      "slug": "new-post",
      "contentType": "blog",
      "title": "New Post",
      "publishDate": "2024-01-15T09:00:00.000Z",
      "notificationSent": false
    }
  ],
  "subscriberStats": {
    "blog": 500,
    "thought": 300,
    "announcement": 800,
    "total": 900
  }
}
```

**Error Responses**:
- 403: Admin access required
- 500: Failed to fetch notifications

#### POST /api/admin/notifications

Administrative actions for notification management.

**Authentication**: Required (Admin JWT token)

**Request Body**:
```typescript
interface AdminActionRequest {
  action: 'send_notification' | 'retry_failed' | 'get_stats';
  contentId?: string;
  contentType?: 'blog' | 'thought';
  force?: boolean;
}
```

**Actions**:

1. **send_notification**: Manually trigger notification for content
   - Requires `contentId` and `contentType`
   - Optional `force` parameter to override existing notifications
   - Validates content exists before sending

2. **retry_failed**: Process failed notifications for retry
   - No additional parameters required
   - Processes all eligible failed notifications

3. **get_stats**: Retrieve fresh notification statistics
   - No additional parameters required
   - Returns current stats

**Success Response** (200):
```json
{
  "message": "Notification sent successfully for blog: My Blog Post",
  "contentId": "content_123",
  "contentType": "blog",
  "notificationSent": true
}
```

**Error Responses**:
- 400: Invalid action, missing required parameters, content not found, or notification already sent
- 403: Admin access required
- 404: Content not found
- 500: Failed to process notification request

## Background Processing API

### Endpoint: `/api/cron/process-notifications`

**File**: `src/pages/api/cron/process-notifications.ts`

#### POST /api/cron/process-notifications

Comprehensive background processing for email notifications system.

**Authentication**: Cron secret header authentication

**Request Headers**:
```
x-cron-secret: <CRON_SECRET>
```

**Processing Pipeline**:

1. **Content Synchronization**
   - Scan content files for updates
   - Update database with new/modified content
   - Generate content hashes for change detection

2. **New Content Notifications**
   - Find unnotified content
   - Send notifications to subscribers
   - Mark content as notified

3. **Failed Notification Retry**
   - Process failed notifications with exponential backoff
   - Retry up to 3 times
   - Update retry counts and timestamps

4. **Cleanup Operations**
   - Remove expired unsubscribe tokens
   - Clean old notification history
   - Archive completed notifications

5. **Statistics Update**
   - Update daily email statistics
   - Generate performance metrics

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notification processing completed",
  "results": {
    "contentSync": {
      "processed": 25,
      "newContent": 3,
      "updated": 2,
      "errors": []
    },
    "notifications": {
      "sent": 150,
      "failed": 2,
      "retried": 5,
      "errors": []
    },
    "cleanup": {
      "expiredTokens": 12,
      "oldNotifications": 45
    },
    "totalProcessingTime": 2500
  },
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**:
- 401: Unauthorized cron request
- 500: Critical error during processing

**Retry Logic**:
```typescript
// Exponential backoff for failed notifications
const retryDelay = Math.pow(2, retryCount) * 3600; // Hours
const retryAfter = now + retryDelay;

await db.updateNotificationStatus(
  notification.id, 
  'failed', 
  error.message,
  retryCount + 1,
  retryAfter
);
```

## Authentication & Security

### JWT Token Handling

**Token Generation**:
```typescript
import { signJWT } from '../../../lib/auth/jwt';

const payload: JWTPayload = {
  sub: user.id,
  email: user.email,
  username: user.username,
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  iat: Math.floor(Date.now() / 1000)
};

const token = await signJWT(payload, env.JWT_SECRET);
```

**Token Verification**:
```typescript
import { verifyJWT } from '../../../lib/auth/jwt';

const payload = await verifyJWT(token, env.JWT_SECRET);
if (!payload) {
  return new Response(
    JSON.stringify({ error: 'Invalid token' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Security Best Practices

1. **Input Validation**
   - All request bodies validated before processing
   - Type checking and sanitization
   - Required field validation

2. **Authentication Middleware**
   - JWT token verification for protected routes
   - User context extraction from tokens
   - Proper error handling for invalid tokens

3. **Authorization Checks**
   - Admin role verification for admin endpoints
   - User ownership validation for user-specific data
   - Resource-level access control

4. **Rate Limiting**
   - Batch processing with delays between batches
   - Email sending rate limits
   - Retry backoff mechanisms

5. **Audit Logging**
   - All unsubscribe actions logged
   - Failed authentication attempts tracked
   - Admin actions recorded

### Request Validation Pattern

```typescript
// Input validation helper
function validateRequest(body: any, requiredFields: string[]): boolean {
  if (!body || typeof body !== 'object') return false;
  
  return requiredFields.every(field => 
    body.hasOwnProperty(field) && body[field] !== undefined
  );
}

// Usage in endpoints
if (!validateRequest(body, ['preferences'])) {
  return new Response(
    JSON.stringify({ error: 'Invalid request body' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## Database Integration

### AuthDB Service Layer

The `AuthDB` class provides comprehensive database operations:

```typescript
export class AuthDB {
  constructor(private db: D1Database) {}

  // User operations
  async getUserById(id: string): Promise<User | null>
  async updateUserPreferences(userId: string, preferences: EmailPreferences): Promise<void>
  async unsubscribeUserFromAll(userId: string): Promise<void>

  // Content operations
  async getUnnotifiedContent(): Promise<ContentItem[]>
  async markContentNotified(contentId: string): Promise<void>
  async getContentItemBySlug(slug: string): Promise<ContentItem | null>

  // Notification operations
  async createEmailNotification(params: CreateEmailNotificationParams): Promise<void>
  async updateNotificationStatus(id: string, status: string, error?: string): Promise<void>
  async getNotificationStats(): Promise<NotificationStats>

  // Token operations
  async createUnsubscribeToken(params: CreateUnsubscribeTokenParams): Promise<void>
  async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken | null>
  async useUnsubscribeToken(tokenId: string, ip?: string, userAgent?: string): Promise<void>

  // Subscriber operations
  async getSubscribersForContentType(contentType: string): Promise<User[]>
  async updateEmailStatistics(dateKey: string, contentType: string, stats: EmailStatisticsUpdate): Promise<void>
}
```

### Database Queries

**User Preferences Update**:
```sql
UPDATE users 
SET email_blog_updates = ?, 
    email_thought_updates = ?, 
    email_announcements = ?, 
    updated_at = ?
WHERE id = ?
```

**Content Synchronization**:
```sql
SELECT id, slug, content_type, title, publish_date, notification_sent
FROM content_items 
WHERE notification_sent = 0 
AND publish_date <= ?
ORDER BY publish_date DESC
```

**Failed Notification Retry**:
```sql
SELECT * FROM email_notifications 
WHERE status = 'failed' 
AND retry_count < 3 
AND (retry_after IS NULL OR retry_after <= ?)
ORDER BY created_at ASC
LIMIT 100
```

## Error Handling & Logging

### Standardized Error Responses

All API endpoints follow consistent error response format:

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  timestamp?: string;
}
```

### Error Handling Pattern

```typescript
try {
  // API logic
} catch (error) {
  console.error('Detailed error context:', error);
  
  return new Response(
    JSON.stringify({ 
      error: 'User-friendly error message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }),
    { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}
```

### Logging Strategy

1. **Request Logging**: All API requests logged with context
2. **Error Logging**: Detailed error information with stack traces
3. **Performance Logging**: Request timing and database query performance
4. **Audit Logging**: Security-relevant actions (auth, unsubscribe, admin actions)

## Integration Patterns

### Email Service Integration

```typescript
// EmailNotificationService integration
const notificationService = new EmailNotificationService(env, db);

// Send blog notification
await notificationService.sendBlogNotification(content);

// Process failed notifications
await notificationService.processFailedNotifications();

// Get notification statistics
const stats = await notificationService.getNotificationStats();
```

### Content Processing Integration

```typescript
// ContentProcessor integration
const contentProcessor = new ContentProcessor(env, db);

// Sync content from files
const results = await contentProcessor.syncContent();

// Process new content
for (const content of unnotifiedContent) {
  if (content.contentType === 'blog') {
    await notificationService.sendBlogNotification(content);
  }
  await db.markContentNotified(content.id);
}
```

### Unsubscribe Service Integration

```typescript
// UnsubscribeService integration
const unsubscribeService = new UnsubscribeService(env, db);

// Generate unsubscribe URL
const unsubscribeUrl = await unsubscribeService.generateUnsubscribeUrl(userId);

// Process unsubscribe request
const result = await unsubscribeService.processUnsubscribe(token, ipAddress, userAgent);
```

## Extension Guidelines

### Adding New API Endpoints

1. **Create Route File**:
   ```typescript
   // src/pages/api/new-endpoint.ts
   import type { APIRoute } from 'astro';
   
   export const prerender = false;
   
   export const GET: APIRoute = async ({ request, locals }) => {
     // Implementation
   };
   ```

2. **Add Authentication**:
   ```typescript
   const user = await getUserFromToken(request, locals.runtime.env);
   if (!user) {
     return new Response(
       JSON.stringify({ error: 'Not authenticated' }),
       { status: 401, headers: { 'Content-Type': 'application/json' } }
     );
   }
   ```

3. **Implement Validation**:
   ```typescript
   const body = await request.json();
   if (!validateRequest(body, ['requiredField'])) {
     return new Response(
       JSON.stringify({ error: 'Invalid request' }),
       { status: 400, headers: { 'Content-Type': 'application/json' } }
     );
   }
   ```

4. **Add Error Handling**:
   ```typescript
   try {
     // Business logic
   } catch (error) {
     console.error('Error in new endpoint:', error);
     return new Response(
       JSON.stringify({ error: 'Internal server error' }),
       { status: 500, headers: { 'Content-Type': 'application/json' } }
     );
   }
   ```

### Implementing New Business Logic

1. **Service Layer Pattern**:
   ```typescript
   export class NewService {
     constructor(private env: Env, private db: AuthDB) {}
     
     async performBusinessLogic(params: any): Promise<Result> {
       // Implementation
     }
   }
   ```

2. **Database Operations**:
   ```typescript
   // Add to AuthDB class
   async newDatabaseOperation(params: any): Promise<any> {
     const result = await this.db.prepare(
       'SELECT * FROM table WHERE condition = ?'
     ).bind(params.value).first();
     
     return result;
   }
   ```

3. **Type Definitions**:
   ```typescript
   // Add to types.ts
   export interface NewType {
     id: string;
     field: string;
     createdAt: Date;
   }
   ```

### Security Considerations for Extensions

1. **Input Validation**: Always validate and sanitize input
2. **Authorization**: Implement proper access controls
3. **Rate Limiting**: Add rate limiting for high-volume operations
4. **Audit Logging**: Log security-relevant actions
5. **Error Handling**: Don't expose sensitive information in errors

## Testing & Monitoring

### API Testing Strategy

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints with database
3. **Authentication Tests**: Verify JWT token handling
4. **Error Scenario Tests**: Test error conditions and edge cases

### Testing Example

```typescript
describe('User Preferences API', () => {
  it('should update user preferences', async () => {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=valid-jwt-token'
      },
      body: JSON.stringify({
        preferences: {
          emailBlogUpdates: true,
          emailThoughtUpdates: false,
          emailAnnouncements: true,
          emailFrequency: 'weekly'
        }
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preferences.emailFrequency).toBe('weekly');
  });
});
```

### Performance Monitoring

1. **Request Timing**: Monitor API response times
2. **Database Performance**: Track query execution times
3. **Error Rates**: Monitor 4xx and 5xx error rates
4. **Background Job Performance**: Track cron job execution times

### Health Check Implementation

```typescript
// src/pages/api/health.ts
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check database connection
    const db = new AuthDB(locals.runtime.env.DB);
    await db.db.prepare('SELECT 1').first();
    
    // Check other dependencies
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        email: 'healthy'
      }
    };
    
    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'unhealthy', error: error.message }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

## Deployment & Production Considerations

### Environment Variables

Required environment variables:
- `JWT_SECRET`: Secret key for JWT token signing
- `CRON_SECRET`: Secret for cron job authentication
- `DB`: Cloudflare D1 database binding
- `SITE_URL`: Base URL for generating links

### Cloudflare Workers Configuration

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "your-database"
database_id = "your-database-id"

[vars]
SITE_URL = "https://your-site.com"

[env.production.vars]
JWT_SECRET = "production-secret"
CRON_SECRET = "production-cron-secret"
```

### Scheduled Jobs

```toml
# wrangler.toml
[[triggers]]
crons = ["0 */6 * * *"]  # Every 6 hours
```

### Production Optimizations

1. **Database Indexes**: Ensure proper indexing for query performance
2. **Connection Pooling**: Optimize database connections
3. **Caching**: Implement response caching where appropriate
4. **Monitoring**: Set up comprehensive monitoring and alerting

This comprehensive API documentation provides a complete reference for understanding, maintaining, and extending the email notifications API system. The implementation follows RESTful principles, implements proper security measures, and provides robust error handling and logging throughout the system.