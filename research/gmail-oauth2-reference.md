# Gmail OAuth2 Reference Implementation Analysis

## Overview
Analysis of the Gmail OAuth2 implementation from the anonymous-comment-box repository, providing a proven pattern for email sending via Gmail API in Cloudflare Workers.

## OAuth2 Configuration

### Client Setup
- **Client Type**: Web application OAuth client
- **Required Scopes**: `https://www.googleapis.com/auth/gmail.send`
- **Redirect URI**: `https://developers.google.com/oauthplayground`
- **Flow Type**: Authorization code with refresh token

### Token Management Architecture

```typescript
interface TokenCache {
  access_token: string;
  expires_at: number;
}

export class GmailAuth {
  private tokenCache: TokenCache | null = null;
  
  async getValidAccessToken(): Promise<string> {
    // Check cached token with 1-minute buffer
    if (this.tokenCache && this.tokenCache.expires_at > Date.now() + 60000) {
      return this.tokenCache.access_token;
    }
    
    // Refresh token if needed
    const accessToken = await this.refreshAccessToken();
    
    // Cache with 55-minute expiration (tokens expire in 1 hour)
    this.tokenCache = {
      access_token: accessToken,
      expires_at: Date.now() + 3300000
    };
    
    return accessToken;
  }
}
```

### Key Features
- **In-memory caching**: Reduces API calls by caching tokens for 55 minutes
- **Automatic refresh**: Seamlessly refreshes tokens when expired
- **Buffer time**: 1-minute buffer prevents edge-case expiration issues
- **Comprehensive error handling**: Handles token refresh failures gracefully

## Token Refresh Implementation

```typescript
private async refreshAccessToken(): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: this.env.GMAIL_CLIENT_ID,
      client_secret: this.env.GMAIL_CLIENT_SECRET,
      refresh_token: this.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth token refresh failed: ${response.status} - ${errorText}`);
  }

  const tokenData = await response.json() as TokenResponse;
  return tokenData.access_token;
}
```

## Email Sending Implementation

### Gmail API Integration

```typescript
async sendEmail(message: string): Promise<void> {
  const accessToken = await this.getValidAccessToken();
  
  // Create RFC 2822 compliant email
  const emailContent = [
    `To: ${this.env.RECIPIENT_EMAIL}`,
    `Subject: Anonymous Feedback`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    message
  ].join('\r\n');
  
  // Base64 encode for Gmail API (URL-safe)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(emailContent);
  const encodedMessage = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Send via Gmail API
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });
  
  // Handle 401 errors with automatic retry
  if (response.status === 401) {
    console.log('Access token expired, clearing cache and retrying...');
    this.tokenCache = null;
    return this.sendEmail(message); // Recursive retry
  }
}
```

### Key Email Features
- **RFC 2822 compliance**: Proper email formatting
- **UTF-8 support**: Handles international characters
- **URL-safe base64**: Gmail API requirement
- **Automatic retry**: 401 errors trigger cache clear and retry
- **Comprehensive logging**: Debug information for troubleshooting

## Configuration Management

### Environment Variables
```typescript
export interface Env {
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  RECIPIENT_EMAIL: string;
  ENVIRONMENT: 'development' | 'production' | 'test';
  QUEUE_DELAY_SECONDS?: string;
}
```

### Secret Management

**Development** (`.dev.vars`):
```bash
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-your-client-secret
GMAIL_REFRESH_TOKEN=1//your-refresh-token
RECIPIENT_EMAIL=your-email@gmail.com
```

**Production** (Cloudflare secrets):
```bash
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put RECIPIENT_EMAIL
```

## Security Patterns

### Minimal Scope Principle
- **Single scope**: Only `gmail.send` permission
- **No read access**: Cannot read existing emails
- **No profile access**: Cannot access user profile information

### Token Security
- **Refresh tokens**: Long-lived, stored securely
- **Access tokens**: Short-lived, cached in memory only
- **Automatic rotation**: Tokens refresh automatically

### Rate Limiting Implementation

```typescript
export class RateLimiter {
  private config: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 10,
  };

  async checkLimit(key: string, env: Env): Promise<RateLimitResult> {
    const current = await env.MESSAGE_QUEUE.get(key);
    const count = current ? parseInt(current) || 0 : 0;
    
    if (count >= this.config.maxRequests) {
      const { metadata } = await env.MESSAGE_QUEUE.getWithMetadata(key);
      const resetTime = (metadata as { resetTime?: number })?.resetTime || Date.now() + this.config.windowMs;
      throw new RateLimitError(count, resetTime);
    }
    
    // Increment and store with TTL
    await env.MESSAGE_QUEUE.put(key, (count + 1).toString(), {
      expirationTtl: Math.floor(this.config.windowMs / 1000),
      metadata: { resetTime: Date.now() + this.config.windowMs }
    });
    
    return {
      remaining: this.config.maxRequests - (count + 1),
      reset: Date.now() + this.config.windowMs,
      limit: this.config.maxRequests
    };
  }
}
```

## Queue and Async Processing

### Message Queue Implementation

```typescript
export async function queueMessage(
  message: string,
  env: Env,
  ctx: ExecutionContext,
  testMode: boolean = false
): Promise<void> {
  const messageId = crypto.randomUUID();
  
  // Calculate delay (1-6 hours random, or immediate for testing)
  let scheduledFor: number;
  if (testMode) {
    scheduledFor = Date.now();
  } else {
    const customDelaySeconds = env.QUEUE_DELAY_SECONDS ? parseInt(env.QUEUE_DELAY_SECONDS) : null;
    if (customDelaySeconds !== null) {
      scheduledFor = Date.now() + (customDelaySeconds * 1000);
    } else {
      const minDelay = 60 * 60 * 1000; // 1 hour
      const maxDelay = 6 * 60 * 60 * 1000; // 6 hours
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      scheduledFor = Date.now() + randomDelay;
    }
  }
  
  // Store in KV with TTL
  await env.MESSAGE_QUEUE.put(`msg_${messageId}`, JSON.stringify({
    id: messageId,
    message,
    queuedAt: Date.now(),
    scheduledFor,
  }), {
    expirationTtl: 24 * 60 * 60, // 24 hours TTL
  });
  
  // Schedule processing
  ctx.waitUntil(scheduleMessageDelivery(messageId, scheduledFor, env));
}
```

### Queue Features
- **Delayed delivery**: Random delays for anonymity
- **Configurable timing**: Environment variable overrides
- **KV storage**: Persistent queue using Cloudflare KV
- **TTL safety**: 24-hour expiration for safety

## Error Handling Patterns

### Comprehensive Error Types
- **OAuth errors**: Token refresh failures
- **API errors**: Gmail API failures
- **Rate limit errors**: Request throttling
- **Network errors**: Connection issues

### Retry Logic
- **401 errors**: Automatic token refresh and retry
- **Rate limiting**: Exponential backoff (via Cloudflare)
- **Transient errors**: Configurable retry attempts

## Dependencies and Libraries

### Core Dependencies
- **No external libraries**: Uses native Web APIs and Cloudflare Workers APIs
- **TypeScript**: Full type safety
- **Cloudflare Workers**: Edge computing platform
- **Cloudflare KV**: Persistent key-value storage

### Development Dependencies
```json
{
  "@cloudflare/workers-types": "^4.20241127.0",
  "wrangler": "^4.22.0",
  "typescript": "^5.3.2",
  "vitest": "^1.0.0"
}
```

## Adaptation Guidelines for Email Notifications

### 1. OAuth Client Setup
- **Create separate OAuth client**: Use different client for production
- **Configure redirect URI**: Set appropriate redirect for your domain
- **Obtain refresh token**: Use OAuth playground to get long-lived refresh token

### 2. Template System Enhancement
```typescript
interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  unsubscribeUrl: string;
}

class NotificationEmailService extends GmailAuth {
  async sendBlogNotification(user: User, post: BlogPost): Promise<void> {
    const template = this.generateBlogTemplate(user, post);
    await this.sendTemplatedEmail(user.email, template);
  }
  
  async sendThoughtNotification(user: User, thought: Thought): Promise<void> {
    const template = this.generateThoughtTemplate(user, thought);
    await this.sendTemplatedEmail(user.email, template);
  }
}
```

### 3. Bulk Email Processing
```typescript
export async function processBulkNotifications(
  users: User[],
  content: BlogPost | Thought,
  contentType: 'blog' | 'thought',
  env: Env
): Promise<void> {
  const emailService = new NotificationEmailService(env);
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(batch.map(user => 
      contentType === 'blog' 
        ? emailService.sendBlogNotification(user, content as BlogPost)
        : emailService.sendThoughtNotification(user, content as Thought)
    ));
    
    // Add delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 4. Unsubscribe Token System
```typescript
export class UnsubscribeTokenService {
  private static generateToken(userId: string, env: Env): string {
    const payload = {
      userId,
      timestamp: Date.now(),
      purpose: 'unsubscribe'
    };
    
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '365d' });
  }
  
  static createUnsubscribeUrl(userId: string, env: Env): string {
    const token = this.generateToken(userId, env);
    return `https://yoursite.com/unsubscribe?token=${token}`;
  }
  
  static async validateAndUnsubscribe(token: string, env: Env): Promise<string> {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    
    // Update user preferences to disable all email notifications
    await env.DB.prepare(
      'UPDATE users SET email_blog_updates = 0, email_thought_updates = 0, email_announcements = 0 WHERE id = ?'
    ).bind(payload.userId).run();
    
    return payload.userId;
  }
}
```

## Best Practices for Implementation

### 1. Security Best Practices
- **Minimal permissions**: Only necessary OAuth scopes
- **Secure secret storage**: Use Cloudflare-managed secrets
- **Token rotation**: Implement automatic refresh token handling
- **Input validation**: Validate all email content and recipients

### 2. Performance Optimization
- **Token caching**: Implement in-memory access token caching
- **Batch processing**: Process multiple notifications efficiently
- **Rate limiting**: Prevent API quota exhaustion
- **Connection pooling**: Reuse HTTP connections where possible

### 3. Error Handling
- **Graceful degradation**: Fallback mechanisms for failures
- **Comprehensive logging**: Detailed error information
- **User-friendly messages**: Clear error responses for users
- **Retry logic**: Automatic recovery from transient failures

### 4. Monitoring and Observability
- **Health checks**: Monitor email service health
- **Delivery tracking**: Track email send success/failures
- **Rate limit monitoring**: Monitor API usage and limits
- **Error alerting**: Alert on critical failures

## Implementation Checklist

### Setup Phase
- [ ] Create Google Cloud project and OAuth client
- [ ] Configure Gmail API access and scopes
- [ ] Obtain refresh token via OAuth playground
- [ ] Set up Cloudflare Workers environment variables

### Development Phase
- [ ] Implement token management and caching
- [ ] Create email template system
- [ ] Add bulk email processing capabilities
- [ ] Implement unsubscribe token system

### Security Phase
- [ ] Add rate limiting for email sending
- [ ] Implement input validation and sanitization
- [ ] Add comprehensive error handling
- [ ] Test token refresh and retry logic

### Production Phase
- [ ] Configure production secrets
- [ ] Add monitoring and alerting
- [ ] Test email delivery and unsubscribe flow
- [ ] Implement email analytics if needed

This reference implementation provides a robust foundation for building production-ready email notification systems using Gmail API with proper security, performance, and reliability considerations.