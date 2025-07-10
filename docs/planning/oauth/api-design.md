# Google OAuth API Design Specification

## Overview

This document defines the API endpoints, request/response schemas, and integration patterns for Google OAuth authentication in the Baba Is Win application.

## API Endpoints

### 1. OAuth Initiation Endpoint

**Endpoint**: `GET /api/auth/google`

**Purpose**: Initiates the Google OAuth flow by redirecting to Google's authorization server.

**Query Parameters**:
- `returnUrl` (optional): URL to redirect to after successful authentication
- `linkAccount` (optional): Set to `"true"` to link Google account to existing user

**Request Examples**:
```http
GET /api/auth/google
GET /api/auth/google?returnUrl=/dashboard
GET /api/auth/google?linkAccount=true&returnUrl=/profile
```

**Response**:
- **Success**: HTTP 302 redirect to Google OAuth authorization URL
- **Error**: HTTP 500 with JSON error response

**Success Response**:
```http
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile&state=...
```

**Error Response**:
```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "OAuth configuration error",
  "message": "Missing required OAuth credentials"
}
```

**Generated OAuth URL Structure**:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=your_client_id&
  redirect_uri=https://your-domain.com/api/auth/google/callback&
  response_type=code&
  scope=openid+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile&
  state=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...&
  access_type=offline&
  prompt=consent
```

### 2. OAuth Callback Endpoint

**Endpoint**: `GET /api/auth/google/callback`

**Purpose**: Handles the OAuth callback from Google, exchanges authorization code for tokens, and creates/authenticates user.

**Query Parameters**:
- `code` (required): Authorization code from Google
- `state` (required): State token for verification
- `error` (optional): Error code if OAuth failed

**Request Examples**:
```http
GET /api/auth/google/callback?code=4/P7q7W91...&state=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
GET /api/auth/google/callback?error=access_denied
```

**Response**:
- **Success**: HTTP 302 redirect to return URL with session cookie set
- **Error**: HTTP 302 redirect to login page with error parameter

**Success Response**:
```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

**Error Response**:
```http
HTTP/1.1 302 Found
Location: /login?error=email_not_verified
```

**Error Codes**:
- `access_denied`: User denied OAuth consent
- `email_not_verified`: Google account email not verified
- `email_exists`: Account with this email already exists
- `account_already_linked`: Google account already linked to another user
- `oauth_failed`: General OAuth failure
- `missing_parameters`: Missing required parameters

### 3. OAuth Status Endpoint

**Endpoint**: `GET /api/auth/google/status`

**Purpose**: Returns OAuth connection status for the current user.

**Authentication**: Required (user must be logged in)

**Request**:
```http
GET /api/auth/google/status
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "connected": true,
  "provider": "google",
  "providerEmail": "user@example.com",
  "displayName": "John Doe",
  "profilePictureUrl": "https://lh3.googleusercontent.com/..."
}
```

**Response Schema**:
```typescript
interface OAuthStatusResponse {
  connected: boolean;
  provider?: 'google';
  providerEmail?: string;
  displayName?: string;
  profilePictureUrl?: string;
}
```

### 4. OAuth Disconnect Endpoint

**Endpoint**: `POST /api/auth/google/disconnect`

**Purpose**: Disconnects Google account from the current user (only for users with password authentication).

**Authentication**: Required

**Request**:
```http
POST /api/auth/google/disconnect
Content-Type: application/json
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

{
  "confirmPassword": "user_password"
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Google account disconnected successfully"
}
```

**Error Response**:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "cannot_disconnect",
  "message": "Cannot disconnect the only authentication method"
}
```

## Request/Response Schemas

### OAuth State Token

**JWT Payload**:
```typescript
interface OAuthState {
  timestamp: number;
  returnUrl?: string;
  linkAccount?: boolean;
  userId?: string;
  iss: string;
  exp: number;
}
```

**Example State Token**:
```json
{
  "timestamp": 1640995200000,
  "returnUrl": "/dashboard",
  "linkAccount": false,
  "iss": "baba-is-win",
  "exp": 1640995800
}
```

### Google Token Exchange Request

**Request to Google**:
```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=your_client_id&
client_secret=your_client_secret&
code=4/P7q7W91...&
grant_type=authorization_code&
redirect_uri=https://your-domain.com/api/auth/google/callback
```

**Response from Google**:
```json
{
  "access_token": "ya29.a0ARrdaM...",
  "expires_in": 3599,
  "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "scope": "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  "token_type": "Bearer",
  "refresh_token": "1//0GiXW5qz..."
}
```

### Google User Info Response

**Request to Google**:
```http
GET https://www.googleapis.com/oauth2/v3/userinfo
Authorization: Bearer ya29.a0ARrdaM...
```

**Response from Google**:
```json
{
  "id": "123456789012345678901",
  "email": "user@example.com",
  "verified_email": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
  "locale": "en"
}
```

### Google ID Token Claims

**Decoded ID Token**:
```json
{
  "iss": "https://accounts.google.com",
  "azp": "your_client_id",
  "aud": "your_client_id",
  "sub": "123456789012345678901",
  "email": "user@example.com",
  "email_verified": true,
  "at_hash": "HK6E_P6Dh8Y",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
  "given_name": "John",
  "family_name": "Doe",
  "locale": "en",
  "iat": 1640995200,
  "exp": 1640998800
}
```

## Integration Patterns

### 1. New User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Google
    participant Database

    User->>Frontend: Click "Sign up with Google"
    Frontend->>API: GET /api/auth/google
    API->>API: Generate state token
    API->>Frontend: Redirect to Google OAuth
    Frontend->>Google: OAuth authorization request
    Google->>User: Show consent screen
    User->>Google: Grant permission
    Google->>API: Redirect to callback with code
    API->>Google: Exchange code for tokens
    Google->>API: Return access token & ID token
    API->>Google: Fetch user info
    Google->>API: Return user profile
    API->>Database: Check if user exists
    Database->>API: User not found
    API->>Database: Create new user
    Database->>API: User created
    API->>API: Create session token
    API->>Frontend: Redirect with session cookie
    Frontend->>User: Logged in to application
```

### 2. Existing User Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Google
    participant Database

    User->>Frontend: Click "Continue with Google"
    Frontend->>API: GET /api/auth/google
    API->>API: Generate state token
    API->>Frontend: Redirect to Google OAuth
    Frontend->>Google: OAuth authorization request
    Google->>User: Show consent screen (if needed)
    User->>Google: Grant permission
    Google->>API: Redirect to callback with code
    API->>Google: Exchange code for tokens
    Google->>API: Return access token & ID token
    API->>Google: Fetch user info
    Google->>API: Return user profile
    API->>Database: Find user by Google ID
    Database->>API: User found
    API->>Database: Update user info
    Database->>API: User updated
    API->>API: Create session token
    API->>Frontend: Redirect with session cookie
    Frontend->>User: Logged in to application
```

### 3. Account Linking Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Google
    participant Database

    User->>Frontend: Click "Link Google Account"
    Frontend->>API: GET /api/auth/google?linkAccount=true
    API->>API: Generate state token with user ID
    API->>Frontend: Redirect to Google OAuth
    Frontend->>Google: OAuth authorization request
    Google->>User: Show consent screen
    User->>Google: Grant permission
    Google->>API: Redirect to callback with code
    API->>Google: Exchange code for tokens
    Google->>API: Return access token & ID token
    API->>Google: Fetch user info
    Google->>API: Return user profile
    API->>Database: Check if Google ID already linked
    Database->>API: Google ID not linked
    API->>Database: Link Google account to user
    Database->>API: Account linked
    API->>Frontend: Redirect to profile with success
    Frontend->>User: Show success message
```

### 4. Error Handling Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Google
    participant Database

    User->>Frontend: Click OAuth button
    Frontend->>API: GET /api/auth/google
    API->>Frontend: Redirect to Google OAuth
    Frontend->>Google: OAuth authorization request
    Google->>User: Show consent screen
    User->>Google: Deny permission
    Google->>API: Redirect with error=access_denied
    API->>API: Handle OAuth error
    API->>Frontend: Redirect to login with error
    Frontend->>User: Show error message
```

## Rate Limiting

### OAuth Endpoint Rate Limits

**Per IP Address**:
- `/api/auth/google`: 10 requests per minute
- `/api/auth/google/callback`: 20 requests per minute
- `/api/auth/google/status`: 60 requests per minute
- `/api/auth/google/disconnect`: 5 requests per minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995800
```

**Rate Limit Exceeded Response**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995800

{
  "error": "rate_limit_exceeded",
  "message": "Too many OAuth requests. Please try again later.",
  "retryAfter": 60
}
```

## Security Headers

### OAuth Endpoints Security

**Required Headers**:
```http
Content-Security-Policy: default-src 'self'; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

**CORS Configuration**:
```typescript
// Only allow OAuth requests from your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};
```

## Testing Endpoints

### Mock OAuth Endpoints (Development Only)

**Endpoint**: `GET /api/auth/google/mock`

**Purpose**: Simulates OAuth flow for testing without Google interaction.

**Query Parameters**:
- `mockUser`: Predefined user scenario (`new`, `existing`, `unverified`)
- `returnUrl`: URL to redirect after mock authentication

**Request**:
```http
GET /api/auth/google/mock?mockUser=new&returnUrl=/dashboard
```

**Response**:
```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session=mock_session_token; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

## Monitoring Endpoints

### OAuth Metrics Endpoint

**Endpoint**: `GET /api/auth/oauth/metrics`

**Purpose**: Returns OAuth authentication metrics (admin only).

**Authentication**: Required (admin role)

**Response**:
```json
{
  "totalOAuthLogins": 1250,
  "totalOAuthSignups": 320,
  "totalAccountLinks": 180,
  "successRate": 0.94,
  "last24Hours": {
    "logins": 45,
    "signups": 12,
    "links": 8,
    "errors": 3
  },
  "topErrors": [
    {
      "error": "email_not_verified",
      "count": 15,
      "percentage": 0.6
    },
    {
      "error": "oauth_failed",
      "count": 10,
      "percentage": 0.4
    }
  ]
}
```

## Environment Configuration

### Development Environment

```typescript
// .env.development
GOOGLE_CLIENT_ID=your_dev_client_id
GOOGLE_CLIENT_SECRET=your_dev_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback
OAUTH_RATE_LIMIT_ENABLED=false
OAUTH_MOCK_ENABLED=true
```

### Production Environment

```typescript
// .env.production
GOOGLE_CLIENT_ID=your_prod_client_id
GOOGLE_CLIENT_SECRET=your_prod_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
OAUTH_RATE_LIMIT_ENABLED=true
OAUTH_MOCK_ENABLED=false
```

## API Client Examples

### JavaScript/TypeScript Client

```typescript
class OAuthClient {
  constructor(private baseUrl: string) {}

  // Initiate OAuth flow
  async initiateOAuth(options: {
    returnUrl?: string;
    linkAccount?: boolean;
  } = {}): Promise<void> {
    const params = new URLSearchParams();
    if (options.returnUrl) params.set('returnUrl', options.returnUrl);
    if (options.linkAccount) params.set('linkAccount', 'true');
    
    const url = `${this.baseUrl}/api/auth/google?${params.toString()}`;
    window.location.href = url;
  }

  // Get OAuth status
  async getOAuthStatus(): Promise<OAuthStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/google/status`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get OAuth status');
    }
    
    return response.json();
  }

  // Disconnect OAuth account
  async disconnectOAuth(password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/google/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ confirmPassword: password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to disconnect OAuth account');
    }
  }
}

// Usage
const oauthClient = new OAuthClient('https://your-domain.com');

// Initiate OAuth login
await oauthClient.initiateOAuth({ returnUrl: '/dashboard' });

// Check OAuth status
const status = await oauthClient.getOAuthStatus();
console.log('OAuth connected:', status.connected);

// Disconnect OAuth
await oauthClient.disconnectOAuth('user_password');
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface OAuthStatus {
  connected: boolean;
  provider?: 'google';
  providerEmail?: string;
  displayName?: string;
  profilePictureUrl?: string;
}

export function useOAuth() {
  const [status, setStatus] = useState<OAuthStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOAuthStatus();
  }, []);

  const fetchOAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus({ connected: false });
      }
    } catch (err) {
      setError('Failed to fetch OAuth status');
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const initiateOAuth = (options: {
    returnUrl?: string;
    linkAccount?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    if (options.returnUrl) params.set('returnUrl', options.returnUrl);
    if (options.linkAccount) params.set('linkAccount', 'true');
    
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const disconnectOAuth = async (password: string) => {
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ confirmPassword: password })
      });
      
      if (response.ok) {
        setStatus({ connected: false });
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      return false;
    }
  };

  return {
    status,
    loading,
    error,
    initiateOAuth,
    disconnectOAuth,
    refetch: fetchOAuthStatus
  };
}
```

## Implementation Checklist

### Backend API
- [ ] Implement `/api/auth/google` endpoint
- [ ] Implement `/api/auth/google/callback` endpoint
- [ ] Implement `/api/auth/google/status` endpoint
- [ ] Implement `/api/auth/google/disconnect` endpoint
- [ ] Add rate limiting middleware
- [ ] Add security headers
- [ ] Add error handling
- [ ] Add request validation
- [ ] Add OAuth state management
- [ ] Add monitoring and logging

### Frontend Integration
- [ ] Create OAuth button component
- [ ] Add OAuth client utility
- [ ] Create React hooks (if using React)
- [ ] Update login/signup forms
- [ ] Update profile page
- [ ] Add error handling UI
- [ ] Add loading states
- [ ] Add success/error messages

### Testing
- [ ] Write unit tests for all endpoints
- [ ] Write integration tests
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Test security headers
- [ ] Test with mock OAuth provider
- [ ] Test account linking scenarios
- [ ] Test disconnection flow

### Documentation
- [ ] Document API endpoints
- [ ] Document request/response schemas
- [ ] Document error codes
- [ ] Document rate limits
- [ ] Document security requirements
- [ ] Document monitoring
- [ ] Create client examples
- [ ] Update integration guide

This API design provides a comprehensive foundation for implementing Google OAuth authentication with proper error handling, security measures, and monitoring capabilities.