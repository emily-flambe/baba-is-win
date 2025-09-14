# Google OAuth Implementation Reference

## IMPORTANT: This is Cloudflare Workers (NOT Pages!)
This application deploys to **Cloudflare Workers** using `wrangler deploy`.
- Production URL: `https://personal.emily-cogsdill.workers.dev` 
- Custom domain: `https://emilycogsdill.com`

## Overview
Our Google OAuth implementation provides secure authentication using Google accounts, with JWT-based session management and proper security measures including rate limiting, CSRF protection, and input validation.

## Architecture

### OAuth Flow
```
User clicks "Sign in with Google"
    “
/api/auth/google (Initiation)
    “
Redirect to Google consent screen
    “
User authorizes
    “
Google redirects to /api/auth/google/callback
    “
Exchange code for tokens
    “
Fetch user info from Google
    “
Create/update user in D1 database
    “
Generate JWT session
    “
Redirect to app with auth cookie
```

## File Structure

### Core OAuth Files
- `/src/pages/api/auth/google.ts` - OAuth initiation endpoint
- `/src/pages/api/auth/google/callback.ts` - OAuth callback handler
- `/src/pages/api/auth/google/status.ts` - Check OAuth link status
- `/src/pages/api/auth/google/disconnect.ts` - Unlink Google account

### Supporting Libraries
- `/src/lib/oauth/config.ts` - OAuth configuration and URL generation
- `/src/lib/oauth/google.ts` - Google OAuth client implementation
- `/src/lib/oauth/state.ts` - CSRF state management
- `/src/lib/oauth/rate-limiter.ts` - Rate limiting for OAuth endpoints
- `/src/lib/oauth/validation.ts` - Request validation
- `/src/lib/oauth/security-monitor.ts` - Security event logging

## Configuration

### Google Cloud Console Setup

1. **Create OAuth 2.0 Client ID**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Web application)

2. **Configure Authorized JavaScript Origins**
   ```
   http://localhost:4321
   http://localhost:8788
   https://personal.emily-cogsdill.workers.dev
   https://emilycogsdill.com
   https://www.emilycogsdill.com
   ```

3. **Configure Authorized Redirect URIs**
   ```
   http://localhost:4321/api/auth/google/callback
   http://localhost:8788/api/auth/google/callback
   https://personal.emily-cogsdill.workers.dev/api/auth/google/callback
   https://emilycogsdill.com/api/auth/google/callback
   https://www.emilycogsdill.com/api/auth/google/callback
   ```

### Environment Variables

#### Local Development (.dev.vars)
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:4321/api/auth/google/callback

# Required for OAuth state management
JWT_SECRET=dev-secret-minimum-32-chars
API_KEY_SALT=dev-salt-for-api-keys
```

#### Production (Cloudflare Workers Secrets)
```bash
# Set secrets using Wrangler CLI
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REDIRECT_URI  # Use production URL
wrangler secret put JWT_SECRET
wrangler secret put API_KEY_SALT
```

## Implementation Details

### OAuth Initiation (`/api/auth/google`)
```typescript
// Key features:
- Rate limiting (10 requests per minute per IP)
- Input validation for returnUrl parameter
- CSRF protection via signed JWT state token
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Configurable OAuth scopes (openid, email, profile)
```

### OAuth Callback (`/api/auth/google/callback`)
```typescript
// Process:
1. Validate authorization code from Google
2. Exchange code for access/refresh tokens
3. Fetch user profile from Google
4. Create or update user in database
5. Handle account linking if user is signed in
6. Generate JWT session tokens
7. Set secure httpOnly cookie
8. Redirect to original returnUrl
```

### Security Features

#### Rate Limiting
- 10 OAuth initiations per minute per IP
- 20 callback attempts per hour per IP
- Exponential backoff for repeated failures

#### CSRF Protection
- Signed JWT state tokens with 10-minute expiration
- State validation on callback
- Origin verification

#### Input Validation
- URL parameter sanitization
- Return URL validation (must be relative path)
- Authorization code format validation

#### Security Monitoring
- All OAuth events logged with severity levels
- Failed attempts tracked
- Suspicious patterns detected

### Database Schema

```sql
-- Users table OAuth fields
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  google_id TEXT UNIQUE,
  google_linked BOOLEAN DEFAULT 0,
  oauth_provider TEXT,
  oauth_data TEXT, -- JSON with additional OAuth data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth-specific indexes
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

### User Experience Flow

1. **First-time Google Sign-in**
   - User clicks "Sign in with Google"
   - Redirected to Google consent screen
   - After authorization, account is created
   - User is signed in automatically

2. **Returning User**
   - Clicks "Sign in with Google"
   - If previously authorized, signs in immediately
   - If not, shows Google consent screen

3. **Account Linking**
   - Existing users can link Google account
   - Accessed via profile settings
   - Allows sign-in with either method

4. **Account Unlinking**
   - Users can disconnect Google account
   - Only if they have a password set
   - Prevents lockout scenarios

## Troubleshooting

### Common Issues

#### "OAuth configuration error" (500)
**Cause**: Missing environment variables
**Solution**: Ensure all secrets are set:
```bash
wrangler secret list  # Check what's configured
```

#### "redirect_uri_mismatch" 
**Cause**: Callback URL not in Google Console
**Solution**: Add exact URL to Authorized redirect URIs

#### Rate Limit Exceeded (429)
**Cause**: Too many OAuth attempts
**Solution**: Wait for rate limit reset (usually 1 minute)

#### Invalid State Token
**Cause**: CSRF token expired or tampered
**Solution**: Restart OAuth flow (tokens expire after 10 minutes)

### Testing OAuth Flow

#### Local Testing
```bash
# Start dev server
npm run dev

# Navigate to
http://localhost:4321/login
# Click "Sign in with Google"
```

#### Production Testing
```bash
# Deploy latest changes
npm run deploy

# Test at your domain
https://emilycogsdill.com/login
```

#### Verify Configuration
```bash
# Check secrets are set
wrangler secret list

# Test OAuth initiation endpoint
curl -I "https://emilycogsdill.com/api/auth/google?returnUrl=/"
# Should return 302 redirect to Google

# Check logs for errors
wrangler tail
```

## Security Considerations

1. **Never commit secrets** - Use .dev.vars locally (gitignored)
2. **Always use HTTPS** in production
3. **Validate all inputs** - Especially returnUrl parameters
4. **Rate limit OAuth endpoints** to prevent abuse
5. **Log security events** for monitoring
6. **Use secure cookies** - httpOnly, sameSite, secure flags
7. **Implement CSRF protection** via state parameter
8. **Handle errors gracefully** - Don't expose internal details

## Maintenance

### Updating OAuth Scopes
Edit `/src/lib/oauth/config.ts`:
```typescript
scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
```

### Rotating Secrets
```bash
# Generate new secret
openssl rand -base64 32

# Update in Cloudflare
wrangler secret put JWT_SECRET

# Update local .dev.vars
```

### Monitoring OAuth Usage
- Check Cloudflare Analytics for OAuth endpoint traffic
- Monitor error rates in wrangler tail
- Review security logs for suspicious patterns

## References
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)