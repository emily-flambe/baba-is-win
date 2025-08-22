# API Documentation

## Base URL
- Development: `http://localhost:4321/api/v1`
- Production: `https://yourdomain.com/api/v1`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

## Endpoints

### Authentication

#### POST `/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt.token.here",
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

#### POST `/auth/register`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

#### POST `/auth/logout`
Logout and invalidate session.

#### GET `/auth/google`
Initiate Google OAuth flow.

#### GET `/auth/google/callback`
Google OAuth callback handler.

### User Management

#### GET `/user/profile`
Get current user profile. (Requires auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/user/profile`
Update user profile. (Requires auth)

**Request:**
```json
{
  "name": "New Name",
  "bio": "Updated bio"
}
```

#### GET `/user/preferences`
Get user preferences. (Requires auth)

#### PUT `/user/preferences`
Update user preferences. (Requires auth)

**Request:**
```json
{
  "emailNotifications": true,
  "frequency": "weekly"
}
```

### Thoughts/Posts

#### GET `/thoughts`
Get public thoughts feed.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `tag` (string): Filter by tag

**Response:**
```json
{
  "success": true,
  "data": {
    "thoughts": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### GET `/thoughts/:id`
Get a specific thought by ID.

#### POST `/thoughts`
Create a new thought. (Requires auth, admin only)

**Request:**
```json
{
  "title": "Thought Title",
  "content": "Thought content...",
  "tags": ["tag1", "tag2"],
  "published": true
}
```

#### PUT `/thoughts/:id`
Update a thought. (Requires auth, admin only)

#### DELETE `/thoughts/:id`
Delete a thought. (Requires auth, admin only)

### Email Subscriptions

#### POST `/subscribe`
Subscribe to email notifications.

**Request:**
```json
{
  "email": "subscriber@example.com",
  "frequency": "daily"
}
```

#### POST `/unsubscribe`
Unsubscribe from email notifications.

**Request:**
```json
{
  "token": "unsubscribe-token"
}
```

### Admin Endpoints

#### GET `/admin/stats`
Get site statistics. (Requires auth, admin only)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": 150,
    "thoughts": 45,
    "subscribers": 230,
    "views": 5000
  }
}
```

#### GET `/admin/users`
List all users. (Requires auth, admin only)

#### POST `/admin/email/test`
Send test email. (Requires auth, admin only)

**Request:**
```json
{
  "to": "test@example.com",
  "template": "welcome"
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Public endpoints: 60 requests per minute
- Admin endpoints: 30 requests per minute

## Error Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Webhooks

### Email Events
Resend webhooks for email delivery status:
- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.complained`

## Testing

Use the provided test script:
```bash
.project/docs/test-curls.sh
```

Or test individual endpoints:
```bash
# Login
curl -X POST http://localhost:4321/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get thoughts
curl http://localhost:4321/api/v1/thoughts
```