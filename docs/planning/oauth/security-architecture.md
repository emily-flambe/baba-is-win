# Google OAuth Security Architecture

## Overview

This document outlines the security architecture, threat model, and security patterns for implementing Google OAuth authentication in the Baba Is Win application. It focuses on protecting against common OAuth vulnerabilities and maintaining the existing security posture.

## Security Objectives

### Primary Security Goals
1. **Authentication Integrity**: Ensure users are who they claim to be
2. **Session Security**: Maintain secure session management
3. **Data Protection**: Protect user data in transit and at rest
4. **Authorization Control**: Prevent unauthorized access to resources
5. **Attack Prevention**: Protect against common OAuth attacks

### Security Principles
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Grant minimum necessary permissions
- **Secure by Default**: Fail securely when errors occur
- **Zero Trust**: Verify every request and user
- **Privacy by Design**: Minimize data collection and retention

## Threat Model

### Attack Vectors

#### 1. Authorization Code Interception
**Threat**: Attacker intercepts authorization code during OAuth flow
**Impact**: Account takeover, unauthorized access
**Mitigation**: 
- Use HTTPS for all OAuth endpoints
- Implement PKCE (Proof Key for Code Exchange)
- Short-lived authorization codes (10 minutes)
- State parameter validation

#### 2. State Parameter Attacks
**Threat**: CSRF attacks via state parameter manipulation
**Impact**: Account linking to wrong user, session hijacking
**Mitigation**:
- Cryptographically signed state tokens
- State token expiration (10 minutes)
- State binding to user session

#### 3. Redirect URI Manipulation
**Threat**: Open redirect attacks via malicious redirect URIs
**Impact**: Phishing, credential theft
**Mitigation**:
- Strict redirect URI validation
- Whitelist allowed redirect URIs
- No wildcard redirect URIs

#### 4. Token Leakage
**Threat**: Access tokens exposed in logs, URLs, or client-side
**Impact**: Unauthorized API access, data breach
**Mitigation**:
- Server-side token handling only
- Secure token storage
- Token rotation
- Minimal token scope

#### 5. Session Fixation
**Threat**: Attacker fixes user session to known value
**Impact**: Account takeover
**Mitigation**:
- Regenerate session tokens after OAuth
- Secure session management
- Session binding to user agent

#### 6. Account Linking Attacks
**Threat**: Unauthorized linking of OAuth accounts
**Impact**: Account takeover, privilege escalation
**Mitigation**:
- Verify email ownership
- Require password confirmation for linking
- Audit account linking events

#### 7. Social Engineering
**Threat**: Phishing attacks targeting OAuth flow
**Impact**: Credential theft, account compromise
**Mitigation**:
- User education
- Clear consent screens
- Domain validation
- Security headers

## Security Architecture

### 1. OAuth Flow Security

#### State Token Security
```typescript
interface SecureStateToken {
  timestamp: number;
  nonce: string;
  returnUrl?: string;
  linkAccount?: boolean;
  userId?: string;
  clientFingerprint: string;
  iss: string;
  exp: number;
}
```

**State Token Generation**:
```typescript
export class SecureStateManager {
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  private generateFingerprint(request: Request): string {
    const userAgent = request.headers.get('User-Agent') || '';
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const acceptEncoding = request.headers.get('Accept-Encoding') || '';
    
    return btoa(`${userAgent}|${acceptLanguage}|${acceptEncoding}`);
  }

  async createSecureState(
    request: Request,
    data: Partial<SecureStateToken>
  ): Promise<string> {
    const payload: SecureStateToken = {
      timestamp: Date.now(),
      nonce: this.generateNonce(),
      clientFingerprint: this.generateFingerprint(request),
      iss: 'baba-is-win',
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
      ...data
    };

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m')
      .sign(this.secret);
  }

  async verifySecureState(
    token: string,
    request: Request
  ): Promise<SecureStateToken> {
    const { payload } = await jwtVerify(token, this.secret);
    const state = payload as SecureStateToken;

    // Verify client fingerprint
    const currentFingerprint = this.generateFingerprint(request);
    if (state.clientFingerprint !== currentFingerprint) {
      throw new Error('Client fingerprint mismatch');
    }

    // Verify timestamp (additional check beyond JWT exp)
    if (Date.now() - state.timestamp > 600000) { // 10 minutes
      throw new Error('State token expired');
    }

    return state;
  }
}
```

#### Authorization Code Security
```typescript
export class AuthorizationCodeValidator {
  static validateAuthorizationCode(code: string): boolean {
    // Validate code format and structure
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Check code length (Google auth codes are typically 60+ chars)
    if (code.length < 40) {
      return false;
    }

    // Validate character set (alphanumeric, -, _, =)
    const validCodePattern = /^[a-zA-Z0-9\-_=]+$/;
    if (!validCodePattern.test(code)) {
      return false;
    }

    return true;
  }

  static isCodeExpired(receivedAt: number): boolean {
    // Authorization codes should be used within 10 minutes
    return Date.now() - receivedAt > 600000;
  }
}
```

### 2. Token Security

#### ID Token Validation
```typescript
export class IDTokenValidator {
  constructor(private clientId: string) {}

  async validateIDToken(idToken: string): Promise<GoogleIDToken> {
    // Decode token without verification first
    const decodedToken = this.decodeToken(idToken);
    
    // Verify token structure
    if (!decodedToken.header || !decodedToken.payload) {
      throw new Error('Invalid ID token structure');
    }

    // Verify algorithm
    if (decodedToken.header.alg !== 'RS256') {
      throw new Error('Invalid token algorithm');
    }

    // Verify issuer
    if (decodedToken.payload.iss !== 'https://accounts.google.com') {
      throw new Error('Invalid token issuer');
    }

    // Verify audience
    if (decodedToken.payload.aud !== this.clientId) {
      throw new Error('Invalid token audience');
    }

    // Verify expiration
    if (decodedToken.payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Verify not before
    if (decodedToken.payload.iat > Math.floor(Date.now() / 1000) + 300) {
      throw new Error('Token issued in future');
    }

    // Verify email if required
    if (!decodedToken.payload.email_verified) {
      throw new Error('Email not verified');
    }

    // Verify token signature using Google's public keys
    await this.verifySignature(idToken);

    return decodedToken.payload;
  }

  private async verifySignature(idToken: string): Promise<void> {
    // Fetch Google's public keys
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    const keys = await response.json();

    // Verify signature using appropriate key
    const header = JSON.parse(atob(idToken.split('.')[0]));
    const key = keys.keys.find((k: any) => k.kid === header.kid);

    if (!key) {
      throw new Error('Unable to find matching key');
    }

    // Use Web Crypto API to verify signature
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [headerB64, payloadB64, signatureB64] = idToken.split('.');
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = this.base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      data
    );

    if (!isValid) {
      throw new Error('Invalid token signature');
    }
  }

  private decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    return {
      header: JSON.parse(atob(parts[0])),
      payload: JSON.parse(atob(parts[1])),
      signature: parts[2]
    };
  }

  private base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return Uint8Array.from(atob(base64 + padding), c => c.charCodeAt(0));
  }
}
```

#### Access Token Security
```typescript
export class AccessTokenManager {
  private static readonly TOKEN_LIFETIME = 3600; // 1 hour

  async secureTokenStorage(
    userId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    // Encrypt tokens before storage
    const encryptedAccess = await this.encryptToken(accessToken);
    const encryptedRefresh = refreshToken ? 
      await this.encryptToken(refreshToken) : null;

    // Store encrypted tokens in database
    await this.db.prepare(`
      INSERT OR REPLACE INTO oauth_tokens (
        user_id, access_token, refresh_token, 
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      encryptedAccess,
      encryptedRefresh,
      Date.now(),
      Date.now() + (this.TOKEN_LIFETIME * 1000)
    ).run();
  }

  async retrieveAccessToken(userId: string): Promise<string | null> {
    const result = await this.db.prepare(`
      SELECT access_token, expires_at 
      FROM oauth_tokens 
      WHERE user_id = ? AND expires_at > ?
    `).bind(userId, Date.now()).first();

    if (!result) {
      return null;
    }

    // Decrypt and return token
    return this.decryptToken(result.access_token);
  }

  private async encryptToken(token: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.encryptionKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(token);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.encryptionKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

### 3. Session Security

#### Secure Session Management
```typescript
export class SecureSessionManager {
  async createOAuthSession(
    user: User,
    oauthProvider: string,
    request: Request
  ): Promise<string> {
    // Create enhanced session token
    const sessionData = {
      userId: user.id,
      email: user.email,
      provider: oauthProvider,
      oauthLinked: true,
      sessionId: crypto.randomUUID(),
      createdAt: Date.now(),
      clientIP: this.getClientIP(request),
      userAgent: request.headers.get('User-Agent') || '',
      iss: 'baba-is-win',
      exp: Math.floor(Date.now() / 1000) + 604800 // 7 days
    };

    const sessionToken = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(this.secret);

    // Store session in database for tracking
    await this.db.prepare(`
      INSERT INTO sessions (
        id, user_id, provider, client_ip, user_agent,
        created_at, expires_at, is_oauth
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionData.sessionId,
      user.id,
      oauthProvider,
      sessionData.clientIP,
      sessionData.userAgent,
      Date.now(),
      Date.now() + 604800000, // 7 days
      1
    ).run();

    return sessionToken;
  }

  async validateSession(
    sessionToken: string,
    request: Request
  ): Promise<SessionData | null> {
    try {
      const { payload } = await jwtVerify(sessionToken, this.secret);
      const session = payload as SessionData;

      // Verify session exists in database
      const dbSession = await this.db.prepare(`
        SELECT * FROM sessions 
        WHERE id = ? AND expires_at > ?
      `).bind(session.sessionId, Date.now()).first();

      if (!dbSession) {
        return null;
      }

      // Verify client IP (optional, configurable)
      const currentIP = this.getClientIP(request);
      if (this.enforceIPBinding && session.clientIP !== currentIP) {
        // Log suspicious activity
        console.warn('Session IP mismatch', {
          sessionId: session.sessionId,
          originalIP: session.clientIP,
          currentIP
        });
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  private getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }
}
```

### 4. Input Validation Security

#### Request Validation
```typescript
export class OAuthRequestValidator {
  static validateInitiationRequest(request: Request): ValidationResult {
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl');
    const linkAccount = url.searchParams.get('linkAccount');

    const errors: string[] = [];

    // Validate return URL
    if (returnUrl) {
      if (!this.isValidReturnUrl(returnUrl)) {
        errors.push('Invalid return URL');
      }
    }

    // Validate link account parameter
    if (linkAccount && !['true', 'false'].includes(linkAccount)) {
      errors.push('Invalid linkAccount parameter');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateCallbackRequest(request: Request): ValidationResult {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const errors: string[] = [];

    // If there's an error, it's a valid OAuth error response
    if (error) {
      return { valid: true, errors: [], oauthError: error };
    }

    // Validate authorization code
    if (!code) {
      errors.push('Missing authorization code');
    } else if (!AuthorizationCodeValidator.validateAuthorizationCode(code)) {
      errors.push('Invalid authorization code format');
    }

    // Validate state token
    if (!state) {
      errors.push('Missing state parameter');
    } else if (!this.isValidJWT(state)) {
      errors.push('Invalid state token format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidReturnUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url, 'https://example.com');
      
      // Only allow relative URLs or same origin
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return false;
      }

      // Prevent open redirects
      const allowedDomains = [
        'localhost',
        'your-domain.com',
        'www.your-domain.com'
      ];

      if (parsedUrl.host && !allowedDomains.includes(parsedUrl.host)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private static isValidJWT(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Validate each part can be decoded
      atob(parts[0]);
      atob(parts[1]);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 5. Rate Limiting Security

#### Advanced Rate Limiting
```typescript
export class OAuthRateLimiter {
  private attempts: Map<string, AttemptRecord[]> = new Map();
  
  interface AttemptRecord {
    timestamp: number;
    success: boolean;
    ip: string;
    userAgent: string;
  }

  async checkRateLimit(request: Request): Promise<RateLimitResult> {
    const clientId = this.getClientIdentifier(request);
    const now = Date.now();

    // Get recent attempts
    const attempts = this.attempts.get(clientId) || [];
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.windowMs
    );

    // Check various rate limits
    const checks = [
      this.checkGeneralRateLimit(recentAttempts),
      this.checkFailureRateLimit(recentAttempts),
      this.checkBurstLimit(recentAttempts),
      this.checkSuspiciousActivity(recentAttempts)
    ];

    // If any check fails, return rate limited
    for (const check of checks) {
      if (!check.allowed) {
        return check;
      }
    }

    // Record this attempt
    const record: AttemptRecord = {
      timestamp: now,
      success: false, // Will be updated later
      ip: this.getClientIP(request),
      userAgent: request.headers.get('User-Agent') || ''
    };

    recentAttempts.push(record);
    this.attempts.set(clientId, recentAttempts);

    return { allowed: true, retryAfter: 0 };
  }

  private checkGeneralRateLimit(attempts: AttemptRecord[]): RateLimitResult {
    const limit = 10; // 10 attempts per window
    if (attempts.length >= limit) {
      return {
        allowed: false,
        retryAfter: this.windowMs / 1000,
        reason: 'General rate limit exceeded'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkFailureRateLimit(attempts: AttemptRecord[]): RateLimitResult {
    const failures = attempts.filter(a => !a.success);
    const limit = 5; // 5 failures per window
    
    if (failures.length >= limit) {
      return {
        allowed: false,
        retryAfter: this.windowMs / 1000,
        reason: 'Too many failed attempts'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkBurstLimit(attempts: AttemptRecord[]): RateLimitResult {
    // Check for burst activity (5 attempts in 1 minute)
    const burstWindow = 60000; // 1 minute
    const now = Date.now();
    const burstAttempts = attempts.filter(
      a => now - a.timestamp < burstWindow
    );

    if (burstAttempts.length >= 5) {
      return {
        allowed: false,
        retryAfter: 60,
        reason: 'Burst limit exceeded'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkSuspiciousActivity(attempts: AttemptRecord[]): RateLimitResult {
    // Check for suspicious patterns
    const uniqueIPs = new Set(attempts.map(a => a.ip));
    const uniqueUserAgents = new Set(attempts.map(a => a.userAgent));

    // Too many different IPs (possible botnet)
    if (uniqueIPs.size > 3 && attempts.length > 5) {
      return {
        allowed: false,
        retryAfter: 300, // 5 minutes
        reason: 'Suspicious activity detected'
      };
    }

    // Too many different user agents (possible automation)
    if (uniqueUserAgents.size > 3 && attempts.length > 5) {
      return {
        allowed: false,
        retryAfter: 300,
        reason: 'Automated behavior detected'
      };
    }

    return { allowed: true, retryAfter: 0 };
  }

  private getClientIdentifier(request: Request): string {
    // Use IP + User Agent as client identifier
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || '';
    return `${ip}:${btoa(userAgent)}`;
  }

  private getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }
}
```

## Security Headers

### Content Security Policy
```typescript
export const oauthCSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://accounts.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://lh3.googleusercontent.com;
  connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  font-src 'self';
  manifest-src 'self';
  media-src 'none';
  worker-src 'none';
`;
```

### Security Headers Middleware
```typescript
export class SecurityHeadersMiddleware {
  static addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('Content-Security-Policy', oauthCSP);

    // HSTS (if HTTPS)
    if (response.url.startsWith('https://')) {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
}
```

## Database Security

### Encrypted Storage
```sql
-- OAuth tokens table with encryption
CREATE TABLE oauth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,  -- Encrypted
  refresh_token TEXT,          -- Encrypted
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OAuth audit log
CREATE TABLE oauth_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,  -- 'login', 'signup', 'link', 'unlink', 'error'
  provider TEXT NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes for performance and security
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
CREATE INDEX idx_oauth_audit_user_id ON oauth_audit_log(user_id);
CREATE INDEX idx_oauth_audit_created_at ON oauth_audit_log(created_at);
CREATE INDEX idx_oauth_audit_event_type ON oauth_audit_log(event_type);
```

### Database Access Control
```typescript
export class SecureOAuthDatabase {
  private db: D1Database;

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    // Parameterized query to prevent SQL injection
    const result = await this.db.prepare(`
      SELECT id, email, username, google_id, provider, 
             display_name, profile_picture_url, created_at
      FROM users 
      WHERE google_id = ? AND provider = 'google'
    `).bind(googleId).first();

    return result ? this.mapToUser(result) : null;
  }

  async createOAuthUser(userData: OAuthUserData): Promise<User> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      // Begin transaction
      const result = await this.db.batch([
        // Create user
        this.db.prepare(`
          INSERT INTO users (
            id, email, username, google_id, provider, provider_email,
            display_name, profile_picture_url, password_hash,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, userData.email, userData.email, userData.googleId,
          'google', userData.providerEmail, userData.displayName,
          userData.profilePictureUrl, '', timestamp, timestamp
        ),
        
        // Log creation
        this.db.prepare(`
          INSERT INTO oauth_audit_log (
            id, user_id, event_type, provider, success, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), id, 'signup', 'google', true, timestamp
        )
      ]);

      if (!result.every(r => r.success)) {
        throw new Error('Failed to create OAuth user');
      }

      return this.getUserByGoogleId(userData.googleId);
    } catch (error) {
      // Log error
      await this.logOAuthError(null, 'signup', 'google', error);
      throw error;
    }
  }

  private async logOAuthError(
    userId: string | null,
    eventType: string,
    provider: string,
    error: any
  ): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO oauth_audit_log (
          id, user_id, event_type, provider, success, 
          error_code, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        userId,
        eventType,
        provider,
        false,
        error.code || 'unknown',
        error.message || 'Unknown error',
        Date.now()
      ).run();
    } catch (logError) {
      console.error('Failed to log OAuth error:', logError);
    }
  }

  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      googleId: row.google_id,
      provider: row.provider,
      displayName: row.display_name,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at
    };
  }
}
```

## Monitoring and Alerting

### Security Event Monitoring
```typescript
export class OAuthSecurityMonitor {
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    request?: Request
  ): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details,
      clientIP: request ? this.getClientIP(request) : null,
      userAgent: request ? request.headers.get('User-Agent') : null,
      requestId: crypto.randomUUID()
    };

    // Log to console (will be picked up by monitoring)
    console.log('OAUTH_SECURITY_EVENT', JSON.stringify(event));

    // Send to monitoring service if configured
    if (process.env.MONITORING_ENDPOINT) {
      await this.sendToMonitoring(event);
    }
  }

  static async monitorOAuthAttempt(
    userId: string | null,
    success: boolean,
    error?: string,
    request?: Request
  ): Promise<void> {
    const severity = success ? 'low' : 'medium';
    
    await this.logSecurityEvent('oauth_attempt', severity, {
      userId,
      success,
      error,
      timestamp: Date.now()
    }, request);

    // Check for suspicious patterns
    if (!success) {
      await this.checkSuspiciousActivity(request);
    }
  }

  private static async checkSuspiciousActivity(request?: Request): Promise<void> {
    if (!request) return;

    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || '';

    // Check for known malicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /python/i,
      /curl/i,
      /wget/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      await this.logSecurityEvent('suspicious_user_agent', 'high', {
        clientIP,
        userAgent,
        reason: 'Suspicious user agent pattern detected'
      });
    }
  }

  private static getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }

  private static async sendToMonitoring(event: any): Promise<void> {
    try {
      await fetch(process.env.MONITORING_ENDPOINT!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_TOKEN}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send monitoring event:', error);
    }
  }
}
```

### Alert Rules
```typescript
export const securityAlerts = {
  // High failure rate
  highFailureRate: {
    condition: 'oauth_failure_rate > 0.5 over 5 minutes',
    severity: 'high',
    action: 'notify_security_team'
  },

  // Suspicious activity
  suspiciousActivity: {
    condition: 'suspicious_user_agent_count > 10 over 1 hour',
    severity: 'medium',
    action: 'increase_rate_limiting'
  },

  // Account takeover attempt
  accountTakeoverAttempt: {
    condition: 'failed_oauth_attempts > 20 from single_ip over 15 minutes',
    severity: 'critical',
    action: 'block_ip_temporarily'
  },

  // Token validation errors
  tokenValidationErrors: {
    condition: 'token_validation_failures > 50 over 1 hour',
    severity: 'high',
    action: 'investigate_token_source'
  }
};
```

## Security Testing

### Automated Security Tests
```typescript
// Security test suite
describe('OAuth Security Tests', () => {
  describe('State Token Security', () => {
    it('should reject expired state tokens', async () => {
      const expiredToken = await createExpiredStateToken();
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'valid_code', state: expiredToken });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_state');
    });

    it('should reject tampered state tokens', async () => {
      const validToken = await createValidStateToken();
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';
      
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'valid_code', state: tamperedToken });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_state');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(15).fill(null).map(() => 
        request(app).get('/api/auth/google')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid redirect URIs', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .query({ returnUrl: 'https://malicious.com/steal' });
      
      expect(response.status).toBe(400);
    });

    it('should sanitize user input', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const response = await request(app)
        .get('/api/auth/google')
        .query({ returnUrl: xssPayload });
      
      expect(response.status).toBe(400);
    });
  });
});
```

## Security Checklist

### Pre-Implementation Security Review
- [ ] Threat model completed and reviewed
- [ ] Security requirements defined
- [ ] Security architecture designed
- [ ] Input validation strategy defined
- [ ] Authentication flow secured
- [ ] Token management strategy defined
- [ ] Session security implemented
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] Database security measures implemented

### Implementation Security Review
- [ ] All input validation implemented
- [ ] State token security implemented
- [ ] ID token validation implemented
- [ ] Access token encryption implemented
- [ ] Session management secured
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Database queries parameterized
- [ ] Error handling secured
- [ ] Logging implemented

### Post-Implementation Security Review
- [ ] Penetration testing completed
- [ ] Security scanning performed
- [ ] Monitoring and alerting configured
- [ ] Incident response plan updated
- [ ] Security documentation updated
- [ ] Team security training completed
- [ ] Regular security reviews scheduled

## Compliance Considerations

### Data Protection
- **GDPR Compliance**: Minimal data collection, user consent, data portability
- **CCPA Compliance**: Privacy notice, opt-out rights, data deletion
- **SOC 2**: Access controls, monitoring, incident response

### Security Standards
- **OAuth 2.0 Security Best Practices**: RFC 6749, RFC 8252
- **OpenID Connect Security**: OpenID Connect Core 1.0
- **OWASP Guidelines**: OWASP OAuth 2.0 Security Cheat Sheet

This security architecture provides comprehensive protection against common OAuth vulnerabilities while maintaining usability and performance. Regular security reviews and updates are essential to maintain security posture as threats evolve.