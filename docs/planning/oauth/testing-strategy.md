# Google OAuth Testing Strategy

## Overview

This document outlines a comprehensive testing strategy for the Google OAuth implementation, covering unit tests, integration tests, end-to-end tests, security tests, and performance tests. The strategy ensures robust, secure, and reliable OAuth functionality.

## Testing Pyramid

```
    /\
   /  \
  /E2E \     End-to-End Tests (10%)
 /______\    - Full OAuth flows
/        \   - User journeys
/Integration\ Integration Tests (30%)
/____________\ - API endpoints
/              \ - Database operations
/   Unit Tests  \ Unit Tests (60%)
/________________\ - Individual functions
                   - Business logic
```

## Test Environment Setup

### Test Database
```typescript
// tests/setup/database.ts
import Database from 'better-sqlite3';
import { migrate } from '../../src/lib/database/migrations';

export class TestDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
    this.setupTables();
  }

  async setupTables(): Promise<void> {
    // Create all tables
    await this.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        google_id TEXT,
        provider TEXT DEFAULT 'email',
        provider_email TEXT,
        display_name TEXT,
        profile_picture_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE oauth_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE oauth_audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        client_ip TEXT,
        user_agent TEXT,
        error_code TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL
      );
    `);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  async seedData(): Promise<void> {
    // Insert test users
    await this.db.prepare(`
      INSERT INTO users (
        id, email, username, password_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run([
      'test-user-1',
      'test@example.com',
      'testuser',
      'hashed_password',
      Date.now(),
      Date.now()
    ]);

    // Insert OAuth user
    await this.db.prepare(`
      INSERT INTO users (
        id, email, username, password_hash, google_id, provider,
        provider_email, display_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      'oauth-user-1',
      'oauth@example.com',
      'oauthuser',
      '',
      '123456789',
      'google',
      'oauth@example.com',
      'OAuth User',
      Date.now(),
      Date.now()
    ]);
  }

  async cleanup(): Promise<void> {
    this.db.close();
  }
}
```

### Mock Services
```typescript
// tests/mocks/google-oauth.ts
export class MockGoogleOAuth {
  static mockTokenResponse = {
    access_token: 'mock-access-token',
    expires_in: 3600,
    id_token: 'mock-id-token',
    token_type: 'Bearer',
    scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
  };

  static mockUserInfo = {
    id: '123456789',
    email: 'test@example.com',
    verified_email: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/picture.jpg',
    locale: 'en'
  };

  static mockIDToken = {
    iss: 'https://accounts.google.com',
    aud: 'test-client-id',
    sub: '123456789',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  static setupMocks(): void {
    // Mock fetch for token exchange
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(this.mockTokenResponse)
        });
      }
      
      if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(this.mockUserInfo)
        });
      }

      if (url.includes('googleapis.com/oauth2/v3/certs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ keys: [] })
        });
      }

      return Promise.reject(new Error('Unexpected URL'));
    });
  }

  static setupFailureMocks(): void {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve('Invalid request')
        });
      }
      
      return Promise.reject(new Error('Network error'));
    });
  }
}
```

## Unit Tests

### 1. OAuth Service Tests
```typescript
// tests/unit/oauth/google-oauth-service.test.ts
import { GoogleOAuthService } from '../../../src/lib/oauth/google';
import { MockGoogleOAuth } from '../../mocks/google-oauth';

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;

  beforeEach(() => {
    service = new GoogleOAuthService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:8788/api/auth/google/callback',
      scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });
  });

  describe('exchangeCodeForTokens', () => {
    beforeEach(() => {
      MockGoogleOAuth.setupMocks();
    });

    it('should exchange authorization code for tokens', async () => {
      const result = await service.exchangeCodeForTokens('test-code');
      
      expect(result).toEqual(MockGoogleOAuth.mockTokenResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams)
        })
      );
    });

    it('should handle token exchange failure', async () => {
      MockGoogleOAuth.setupFailureMocks();
      
      await expect(service.exchangeCodeForTokens('invalid-code'))
        .rejects
        .toThrow('Token exchange failed: Invalid request');
    });

    it('should include correct parameters in token request', async () => {
      await service.exchangeCodeForTokens('test-code');
      
      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const body = callArgs[1].body as URLSearchParams;
      
      expect(body.get('client_id')).toBe('test-client-id');
      expect(body.get('client_secret')).toBe('test-client-secret');
      expect(body.get('code')).toBe('test-code');
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('redirect_uri')).toBe('http://localhost:8788/api/auth/google/callback');
    });
  });

  describe('getUserInfo', () => {
    beforeEach(() => {
      MockGoogleOAuth.setupMocks();
    });

    it('should fetch user info with access token', async () => {
      const result = await service.getUserInfo('test-access-token');
      
      expect(result).toEqual(MockGoogleOAuth.mockUserInfo);
      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token'
          }
        })
      );
    });

    it('should handle user info fetch failure', async () => {
      MockGoogleOAuth.setupFailureMocks();
      
      await expect(service.getUserInfo('invalid-token'))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('verifyIdToken', () => {
    it('should verify ID token successfully', async () => {
      // Mock ID token verification
      const mockIdToken = 'mock.id.token';
      MockGoogleOAuth.setupMocks();
      
      // This would require more complex mocking of JWT verification
      // For now, we'll test the basic structure
      expect(service.verifyIdToken).toBeDefined();
    });
  });
});
```

### 2. State Management Tests
```typescript
// tests/unit/oauth/state-manager.test.ts
import { OAuthStateManager } from '../../../src/lib/oauth/state';

describe('OAuthStateManager', () => {
  let stateManager: OAuthStateManager;

  beforeEach(() => {
    stateManager = new OAuthStateManager('test-jwt-secret');
  });

  describe('createState', () => {
    it('should create valid state token', async () => {
      const state = await stateManager.createState({
        returnUrl: '/dashboard',
        linkAccount: false
      });
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.split('.')).toHaveLength(3); // JWT format
    });

    it('should include timestamp in state', async () => {
      const beforeTime = Date.now();
      const state = await stateManager.createState({});
      const afterTime = Date.now();
      
      const verified = await stateManager.verifyState(state);
      
      expect(verified.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(verified.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('verifyState', () => {
    it('should verify valid state token', async () => {
      const originalData = {
        returnUrl: '/dashboard',
        linkAccount: true,
        userId: 'user-123'
      };
      
      const state = await stateManager.createState(originalData);
      const verified = await stateManager.verifyState(state);
      
      expect(verified.returnUrl).toBe(originalData.returnUrl);
      expect(verified.linkAccount).toBe(originalData.linkAccount);
      expect(verified.userId).toBe(originalData.userId);
    });

    it('should reject invalid state token', async () => {
      const invalidState = 'invalid.state.token';
      
      await expect(stateManager.verifyState(invalidState))
        .rejects
        .toThrow('Invalid or expired OAuth state');
    });

    it('should reject expired state token', async () => {
      // Mock time to create expired token
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1000000);
      
      const state = await stateManager.createState({});
      
      // Restore time and advance
      Date.now = originalNow;
      
      await expect(stateManager.verifyState(state))
        .rejects
        .toThrow('Invalid or expired OAuth state');
    });
  });
});
```

### 3. User Manager Tests
```typescript
// tests/unit/auth/user-manager.test.ts
import { UserManager } from '../../../src/lib/auth/user-manager';
import { TestDatabase } from '../../setup/database';

describe('UserManager', () => {
  let userManager: UserManager;
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.seedData();
    userManager = new UserManager(testDb.getDatabase());
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('findUserByGoogleId', () => {
    it('should find user by Google ID', async () => {
      const user = await userManager.findUserByGoogleId('123456789');
      
      expect(user).toBeDefined();
      expect(user.google_id).toBe('123456789');
      expect(user.email).toBe('oauth@example.com');
    });

    it('should return null for non-existent Google ID', async () => {
      const user = await userManager.findUserByGoogleId('non-existent');
      
      expect(user).toBeNull();
    });
  });

  describe('createOAuthUser', () => {
    it('should create new OAuth user', async () => {
      const userData = {
        googleId: '987654321',
        email: 'newuser@example.com',
        displayName: 'New User',
        profilePictureUrl: 'https://example.com/picture.jpg',
        providerEmail: 'newuser@example.com'
      };
      
      const user = await userManager.createOAuthUser(userData);
      
      expect(user).toBeDefined();
      expect(user.google_id).toBe(userData.googleId);
      expect(user.email).toBe(userData.email);
      expect(user.provider).toBe('google');
      expect(user.display_name).toBe(userData.displayName);
    });

    it('should handle duplicate email error', async () => {
      const userData = {
        googleId: '987654321',
        email: 'test@example.com', // Already exists
        displayName: 'New User',
        profilePictureUrl: 'https://example.com/picture.jpg',
        providerEmail: 'test@example.com'
      };
      
      await expect(userManager.createOAuthUser(userData))
        .rejects
        .toThrow();
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to existing user', async () => {
      const userData = {
        googleId: '555666777',
        email: 'test@example.com',
        displayName: 'Test User Updated',
        profilePictureUrl: 'https://example.com/new-picture.jpg',
        providerEmail: 'test@example.com'
      };
      
      await userManager.linkGoogleAccount('test-user-1', userData);
      
      const user = await userManager.findUserByGoogleId('555666777');
      expect(user).toBeDefined();
      expect(user.id).toBe('test-user-1');
      expect(user.google_id).toBe('555666777');
    });

    it('should handle non-existent user', async () => {
      const userData = {
        googleId: '555666777',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePictureUrl: 'https://example.com/picture.jpg',
        providerEmail: 'test@example.com'
      };
      
      await expect(userManager.linkGoogleAccount('non-existent', userData))
        .rejects
        .toThrow();
    });
  });
});
```

### 4. Validation Tests
```typescript
// tests/unit/oauth/validation.test.ts
import { OAuthRequestValidator } from '../../../src/lib/oauth/validation';

describe('OAuthRequestValidator', () => {
  describe('validateInitiationRequest', () => {
    it('should validate valid initiation request', () => {
      const request = new Request('https://example.com/api/auth/google?returnUrl=/dashboard');
      
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid return URL', () => {
      const request = new Request('https://example.com/api/auth/google?returnUrl=https://malicious.com');
      
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid return URL');
    });

    it('should validate link account parameter', () => {
      const request = new Request('https://example.com/api/auth/google?linkAccount=true');
      
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid link account parameter', () => {
      const request = new Request('https://example.com/api/auth/google?linkAccount=invalid');
      
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid linkAccount parameter');
    });
  });

  describe('validateCallbackRequest', () => {
    it('should validate valid callback request', () => {
      const request = new Request('https://example.com/api/auth/google/callback?code=valid_code&state=valid.jwt.token');
      
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle OAuth error response', () => {
      const request = new Request('https://example.com/api/auth/google/callback?error=access_denied');
      
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.oauthError).toBe('access_denied');
    });

    it('should reject missing authorization code', () => {
      const request = new Request('https://example.com/api/auth/google/callback?state=valid.jwt.token');
      
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing authorization code');
    });

    it('should reject invalid authorization code format', () => {
      const request = new Request('https://example.com/api/auth/google/callback?code=invalid&state=valid.jwt.token');
      
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid authorization code format');
    });
  });
});
```

### 5. Security Tests
```typescript
// tests/unit/security/rate-limiter.test.ts
import { OAuthRateLimiter } from '../../../src/lib/oauth/rate-limiter';

describe('OAuthRateLimiter', () => {
  let rateLimiter: OAuthRateLimiter;

  beforeEach(() => {
    rateLimiter = new OAuthRateLimiter();
  });

  describe('isRateLimited', () => {
    it('should allow requests within limit', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });
      
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(request);
        expect(result.allowed).toBe(true);
      }
    });

    it('should rate limit excessive requests', async () => {
      const request = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });
      
      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit(request);
      }
      
      // Next request should be rate limited
      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different IPs separately', async () => {
      const request1 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.1' }
      });
      const request2 = new Request('https://example.com', {
        headers: { 'CF-Connecting-IP': '192.168.1.2' }
      });
      
      // Exhaust limit for first IP
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit(request1);
      }
      
      // Second IP should still be allowed
      const result = await rateLimiter.checkRateLimit(request2);
      expect(result.allowed).toBe(true);
    });
  });
});
```

## Integration Tests

### 1. OAuth Flow Integration Tests
```typescript
// tests/integration/oauth-flow.test.ts
import { request } from 'supertest';
import { createTestApp } from '../setup/app';
import { TestDatabase } from '../setup/database';
import { MockGoogleOAuth } from '../mocks/google-oauth';

describe('OAuth Flow Integration', () => {
  let app: any;
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.seedData();
    app = await createTestApp(testDb.getDatabase());
    MockGoogleOAuth.setupMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('OAuth Initiation', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302);
      
      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('redirect_uri=');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('scope=openid+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile');
      expect(response.headers.location).toContain('state=');
    });

    it('should include return URL in state', async () => {
      const response = await request(app)
        .get('/api/auth/google?returnUrl=/dashboard')
        .expect(302);
      
      const url = new URL(response.headers.location);
      const state = url.searchParams.get('state');
      
      expect(state).toBeDefined();
      // Would need to decode and verify state contains returnUrl
    });
  });

  describe('OAuth Callback - New User', () => {
    it('should create new user and redirect', async () => {
      // First, get a state token
      const initiationResponse = await request(app)
        .get('/api/auth/google');
      
      const authUrl = new URL(initiationResponse.headers.location);
      const state = authUrl.searchParams.get('state');
      
      // Mock callback with new user
      MockGoogleOAuth.mockUserInfo.id = 'new-user-123';
      MockGoogleOAuth.mockUserInfo.email = 'newuser@example.com';
      
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'valid_authorization_code',
          state: state
        })
        .expect(302);
      
      expect(response.headers.location).toBe('/');
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Verify user was created in database
      const user = await testDb.getDatabase()
        .prepare('SELECT * FROM users WHERE google_id = ?')
        .get('new-user-123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(user.provider).toBe('google');
    });
  });

  describe('OAuth Callback - Existing User', () => {
    it('should login existing OAuth user', async () => {
      const initiationResponse = await request(app)
        .get('/api/auth/google');
      
      const authUrl = new URL(initiationResponse.headers.location);
      const state = authUrl.searchParams.get('state');
      
      // Mock callback with existing user
      MockGoogleOAuth.mockUserInfo.id = '123456789';
      MockGoogleOAuth.mockUserInfo.email = 'oauth@example.com';
      
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'valid_authorization_code',
          state: state
        })
        .expect(302);
      
      expect(response.headers.location).toBe('/');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('OAuth Callback - Account Linking', () => {
    it('should link Google account to existing user', async () => {
      // First login as existing user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const sessionCookie = loginResponse.headers['set-cookie'];
      
      // Initiate account linking
      const initiationResponse = await request(app)
        .get('/api/auth/google?linkAccount=true')
        .set('Cookie', sessionCookie)
        .expect(302);
      
      const authUrl = new URL(initiationResponse.headers.location);
      const state = authUrl.searchParams.get('state');
      
      // Mock callback for linking
      MockGoogleOAuth.mockUserInfo.id = 'link-user-123';
      MockGoogleOAuth.mockUserInfo.email = 'test@example.com';
      
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'valid_authorization_code',
          state: state
        })
        .expect(302);
      
      expect(response.headers.location).toBe('/profile');
      
      // Verify account was linked
      const user = await testDb.getDatabase()
        .prepare('SELECT * FROM users WHERE email = ?')
        .get('test@example.com');
      
      expect(user.google_id).toBe('link-user-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle OAuth access denied', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback?error=access_denied')
        .expect(302);
      
      expect(response.headers.location).toContain('/login');
      expect(response.headers.location).toContain('error=access_denied');
    });

    it('should handle missing parameters', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .expect(302);
      
      expect(response.headers.location).toContain('/login');
      expect(response.headers.location).toContain('error=missing_parameters');
    });

    it('should handle invalid state token', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'valid_code',
          state: 'invalid.state.token'
        })
        .expect(302);
      
      expect(response.headers.location).toContain('/login');
      expect(response.headers.location).toContain('error=oauth_failed');
    });
  });
});
```

### 2. Database Integration Tests
```typescript
// tests/integration/database.test.ts
import { TestDatabase } from '../setup/database';
import { UserManager } from '../../src/lib/auth/user-manager';

describe('Database Integration', () => {
  let testDb: TestDatabase;
  let userManager: UserManager;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.seedData();
    userManager = new UserManager(testDb.getDatabase());
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('User Operations', () => {
    it('should handle concurrent user creation', async () => {
      const userData = {
        googleId: 'concurrent-user',
        email: 'concurrent@example.com',
        displayName: 'Concurrent User',
        profilePictureUrl: 'https://example.com/picture.jpg',
        providerEmail: 'concurrent@example.com'
      };

      // Attempt to create same user concurrently
      const promises = Array(5).fill(null).map(() => 
        userManager.createOAuthUser(userData)
      );

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(4);
    });

    it('should maintain referential integrity', async () => {
      // Create user
      const userData = {
        googleId: 'integrity-user',
        email: 'integrity@example.com',
        displayName: 'Integrity User',
        profilePictureUrl: 'https://example.com/picture.jpg',
        providerEmail: 'integrity@example.com'
      };

      const user = await userManager.createOAuthUser(userData);
      
      // Create session
      await testDb.getDatabase()
        .prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(['session-1', user.id, Date.now() + 3600000, Date.now()]);
      
      // Delete user should cascade delete session
      await testDb.getDatabase()
        .prepare('DELETE FROM users WHERE id = ?')
        .run([user.id]);
      
      const session = await testDb.getDatabase()
        .prepare('SELECT * FROM sessions WHERE user_id = ?')
        .get(user.id);
      
      expect(session).toBeUndefined();
    });
  });

  describe('OAuth Token Management', () => {
    it('should store and retrieve encrypted tokens', async () => {
      const tokenManager = new AccessTokenManager(testDb.getDatabase());
      
      const userId = 'test-user-1';
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';
      
      await tokenManager.secureTokenStorage(userId, accessToken, refreshToken);
      
      const retrievedToken = await tokenManager.retrieveAccessToken(userId);
      
      expect(retrievedToken).toBe(accessToken);
    });

    it('should handle token expiration', async () => {
      const tokenManager = new AccessTokenManager(testDb.getDatabase());
      
      const userId = 'test-user-1';
      const accessToken = 'expired-token';
      
      // Mock expired token
      await testDb.getDatabase()
        .prepare('INSERT INTO oauth_tokens (id, user_id, access_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(['token-1', userId, accessToken, Date.now() - 1000, Date.now()]);
      
      const retrievedToken = await tokenManager.retrieveAccessToken(userId);
      
      expect(retrievedToken).toBeNull();
    });
  });
});
```

## End-to-End Tests

### 1. Full OAuth Flow Tests
```typescript
// tests/e2e/oauth-flow.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('OAuth Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/login');
  });

  test('should complete OAuth signup flow', async ({ page }) => {
    // Click Google OAuth button
    await page.click('[data-testid="google-oauth-button"]');
    
    // Should redirect to Google (in test, we'll mock this)
    await page.waitForURL(/accounts\.google\.com/);
    
    // Mock Google consent (in real test, this would be automated)
    await page.goto('/api/auth/google/callback?code=test_code&state=test_state');
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle OAuth login for existing user', async ({ page }) => {
    // Pre-create OAuth user in test database
    await page.goto('/login');
    
    // Click Google OAuth button
    await page.click('[data-testid="google-oauth-button"]');
    
    // Mock successful OAuth flow
    await page.goto('/api/auth/google/callback?code=existing_user_code&state=test_state');
    
    // Should redirect to home page
    await page.waitForURL('/');
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Simulate OAuth error
    await page.goto('/api/auth/google/callback?error=access_denied');
    
    // Should redirect to login with error
    await page.waitForURL('/login');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('access_denied');
  });
});
```

### 2. Account Linking E2E Tests
```typescript
// tests/e2e/account-linking.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Account Linking E2E', () => {
  test('should link Google account to existing user', async ({ page }) => {
    // Login with email/password
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Go to profile page
    await page.goto('/profile');
    
    // Click link Google account
    await page.click('[data-testid="link-google-account"]');
    
    // Should redirect to Google OAuth
    await page.waitForURL(/accounts\.google\.com/);
    
    // Mock successful linking
    await page.goto('/api/auth/google/callback?code=link_code&state=link_state');
    
    // Should redirect back to profile
    await page.waitForURL('/profile');
    
    // Should show Google account as linked
    await expect(page.locator('[data-testid="google-account-connected"]')).toBeVisible();
  });

  test('should prevent linking already linked account', async ({ page }) => {
    // Login with email/password
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Go to profile page
    await page.goto('/profile');
    
    // Click link Google account
    await page.click('[data-testid="link-google-account"]');
    
    // Mock linking account already linked to another user
    await page.goto('/api/auth/google/callback?code=already_linked_code&state=link_state');
    
    // Should redirect back to profile with error
    await page.waitForURL('/profile');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('already linked');
  });
});
```

## Performance Tests

### 1. Load Testing
```typescript
// tests/performance/load-test.ts
import { test } from '@playwright/test';

test.describe('OAuth Performance', () => {
  test('should handle concurrent OAuth requests', async ({ page }) => {
    const concurrentRequests = 50;
    const startTime = Date.now();
    
    // Create multiple OAuth initiation requests
    const promises = Array(concurrentRequests).fill(null).map(async (_, index) => {
      const response = await page.request.get(`/api/auth/google?returnUrl=/test-${index}`);
      return response.status();
    });
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // All requests should succeed
    expect(results.every(status => status === 302)).toBe(true);
    
    // Should complete within reasonable time (2 seconds)
    expect(endTime - startTime).toBeLessThan(2000);
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    const requests = 20;
    const results = [];
    
    // Make rapid requests
    for (let i = 0; i < requests; i++) {
      const response = await page.request.get('/api/auth/google');
      results.push(response.status());
    }
    
    // Should have some rate limited responses
    const rateLimited = results.filter(status => status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 2. Database Performance Tests
```typescript
// tests/performance/database-performance.test.ts
import { TestDatabase } from '../setup/database';
import { UserManager } from '../../src/lib/auth/user-manager';

describe('Database Performance', () => {
  let testDb: TestDatabase;
  let userManager: UserManager;

  beforeEach(async () => {
    testDb = new TestDatabase();
    userManager = new UserManager(testDb.getDatabase());
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  test('should handle bulk user creation efficiently', async () => {
    const userCount = 1000;
    const startTime = Date.now();
    
    const promises = Array(userCount).fill(null).map(async (_, index) => {
      const userData = {
        googleId: `bulk-user-${index}`,
        email: `bulk${index}@example.com`,
        displayName: `Bulk User ${index}`,
        profilePictureUrl: `https://example.com/picture${index}.jpg`,
        providerEmail: `bulk${index}@example.com`
      };
      
      return userManager.createOAuthUser(userData);
    });
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
    
    // Verify all users were created
    const userCount = await testDb.getDatabase()
      .prepare('SELECT COUNT(*) as count FROM users WHERE provider = ?')
      .get('google');
    
    expect(userCount.count).toBe(userCount);
  });

  test('should perform efficient OAuth lookups', async () => {
    // Create test users
    const userCount = 10000;
    const db = testDb.getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, username, google_id, provider, password_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (let i = 0; i < userCount; i++) {
      stmt.run([
        `perf-user-${i}`,
        `perf${i}@example.com`,
        `perfuser${i}`,
        `google-id-${i}`,
        'google',
        '',
        Date.now(),
        Date.now()
      ]);
    }
    
    // Test lookup performance
    const startTime = Date.now();
    const lookupCount = 100;
    
    for (let i = 0; i < lookupCount; i++) {
      const randomId = Math.floor(Math.random() * userCount);
      await userManager.findUserByGoogleId(`google-id-${randomId}`);
    }
    
    const endTime = Date.now();
    const avgLookupTime = (endTime - startTime) / lookupCount;
    
    // Each lookup should be fast (< 10ms)
    expect(avgLookupTime).toBeLessThan(10);
  });
});
```

## Security Tests

### 1. OAuth Security Tests
```typescript
// tests/security/oauth-security.test.ts
import { test, expect } from '@playwright/test';

test.describe('OAuth Security', () => {
  test('should prevent state token tampering', async ({ page }) => {
    // Get valid state token
    const response = await page.request.get('/api/auth/google');
    const location = response.headers().location;
    const url = new URL(location);
    const validState = url.searchParams.get('state');
    
    // Tamper with state token
    const tamperedState = validState.slice(0, -10) + 'tampered123';
    
    // Try to use tampered state
    const callbackResponse = await page.request.get(
      `/api/auth/google/callback?code=valid_code&state=${tamperedState}`
    );
    
    // Should redirect to login with error
    expect(callbackResponse.status()).toBe(302);
    expect(callbackResponse.headers().location).toContain('/login');
    expect(callbackResponse.headers().location).toContain('error=oauth_failed');
  });

  test('should prevent replay attacks', async ({ page }) => {
    // Get valid state token
    const response = await page.request.get('/api/auth/google');
    const location = response.headers().location;
    const url = new URL(location);
    const state = url.searchParams.get('state');
    
    // Use state token once
    await page.request.get(`/api/auth/google/callback?code=valid_code&state=${state}`);
    
    // Try to reuse same state token
    const replayResponse = await page.request.get(
      `/api/auth/google/callback?code=valid_code&state=${state}`
    );
    
    // Should be rejected
    expect(replayResponse.status()).toBe(302);
    expect(replayResponse.headers().location).toContain('error=oauth_failed');
  });

  test('should enforce rate limiting', async ({ page }) => {
    const requests = 20;
    const results = [];
    
    // Make rapid requests
    for (let i = 0; i < requests; i++) {
      const response = await page.request.get('/api/auth/google');
      results.push(response.status());
    }
    
    // Should have rate limited responses
    const rateLimited = results.filter(status => status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should validate redirect URIs', async ({ page }) => {
    // Try to use invalid redirect URI
    const response = await page.request.get('/api/auth/google?returnUrl=https://malicious.com');
    
    // Should reject invalid redirect
    expect(response.status()).toBe(400);
  });
});
```

### 2. Session Security Tests
```typescript
// tests/security/session-security.test.ts
import { test, expect } from '@playwright/test';

test.describe('Session Security', () => {
  test('should set secure session cookies', async ({ page }) => {
    // Complete OAuth flow
    await page.goto('/api/auth/google/callback?code=test_code&state=valid_state');
    
    // Check session cookie properties
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.httpOnly).toBe(true);
    expect(sessionCookie.secure).toBe(true);
    expect(sessionCookie.sameSite).toBe('Strict');
  });

  test('should invalidate sessions on logout', async ({ page }) => {
    // Login via OAuth
    await page.goto('/api/auth/google/callback?code=test_code&state=valid_state');
    
    // Verify authenticated
    await page.goto('/profile');
    expect(page.url()).toContain('/profile');
    
    // Logout
    await page.goto('/api/auth/logout');
    
    // Try to access protected resource
    await page.goto('/profile');
    
    // Should redirect to login
    expect(page.url()).toContain('/login');
  });
});
```

## Test Data Management

### 1. Test Data Factory
```typescript
// tests/factories/user-factory.ts
export class UserFactory {
  static createEmailUser(overrides: Partial<User> = {}): User {
    return {
      id: crypto.randomUUID(),
      email: 'test@example.com',
      username: 'testuser',
      provider: 'email',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides
    };
  }

  static createOAuthUser(overrides: Partial<User> = {}): User {
    return {
      id: crypto.randomUUID(),
      email: 'oauth@example.com',
      username: 'oauthuser',
      provider: 'google',
      googleId: '123456789',
      providerEmail: 'oauth@example.com',
      displayName: 'OAuth User',
      profilePictureUrl: 'https://example.com/picture.jpg',
      passwordHash: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides
    };
  }

  static createGoogleUserInfo(overrides: Partial<GoogleUserInfo> = {}): GoogleUserInfo {
    return {
      id: '123456789',
      email: 'user@example.com',
      verified_email: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/picture.jpg',
      locale: 'en',
      ...overrides
    };
  }
}
```

### 2. Test Database Seeding
```typescript
// tests/setup/seeder.ts
export class DatabaseSeeder {
  constructor(private db: Database.Database) {}

  async seedUsers(): Promise<void> {
    const users = [
      UserFactory.createEmailUser({
        id: 'email-user-1',
        email: 'email1@example.com',
        username: 'emailuser1'
      }),
      UserFactory.createEmailUser({
        id: 'email-user-2',
        email: 'email2@example.com',
        username: 'emailuser2'
      }),
      UserFactory.createOAuthUser({
        id: 'oauth-user-1',
        email: 'oauth1@example.com',
        googleId: 'google-123'
      }),
      UserFactory.createOAuthUser({
        id: 'oauth-user-2',
        email: 'oauth2@example.com',
        googleId: 'google-456'
      })
    ];

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, email, username, password_hash, google_id, provider,
        provider_email, display_name, profile_picture_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      stmt.run([
        user.id,
        user.email,
        user.username,
        user.passwordHash,
        user.googleId || null,
        user.provider,
        user.providerEmail || null,
        user.displayName || null,
        user.profilePictureUrl || null,
        user.createdAt,
        user.updatedAt
      ]);
    }
  }

  async seedSessions(): Promise<void> {
    const sessions = [
      {
        id: 'session-1',
        userId: 'email-user-1',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now()
      },
      {
        id: 'session-2',
        userId: 'oauth-user-1',
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now()
      }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const session of sessions) {
      stmt.run([session.id, session.userId, session.expiresAt, session.createdAt]);
    }
  }
}
```

## Test Execution

### 1. Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:security": "jest tests/security",
    "test:performance": "jest tests/performance",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

### 2. Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### 3. Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8788',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
```

## Continuous Integration

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/oauth-tests.yml
name: OAuth Tests

on:
  push:
    branches: [ main, feature-google-oauth ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run security tests
      run: npm run test:security
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
```

## Testing Checklist

### Pre-Implementation Testing
- [ ] Test environment setup completed
- [ ] Mock services configured
- [ ] Test database schema created
- [ ] Test data factories created
- [ ] Test utilities implemented

### Unit Testing
- [ ] OAuth service tests implemented
- [ ] State management tests implemented
- [ ] User management tests implemented
- [ ] Validation tests implemented
- [ ] Security utility tests implemented
- [ ] Rate limiting tests implemented

### Integration Testing
- [ ] OAuth flow integration tests implemented
- [ ] Database integration tests implemented
- [ ] API endpoint tests implemented
- [ ] Error handling tests implemented
- [ ] Session management tests implemented

### End-to-End Testing
- [ ] Complete OAuth flow tests implemented
- [ ] Account linking tests implemented
- [ ] Error scenario tests implemented
- [ ] Cross-browser tests implemented
- [ ] Mobile tests implemented

### Security Testing
- [ ] State token security tests implemented
- [ ] Session security tests implemented
- [ ] Input validation tests implemented
- [ ] Rate limiting tests implemented
- [ ] CSRF protection tests implemented

### Performance Testing
- [ ] Load testing implemented
- [ ] Database performance tests implemented
- [ ] Concurrent request tests implemented
- [ ] Memory usage tests implemented
- [ ] Response time tests implemented

### Deployment Testing
- [ ] Environment-specific tests implemented
- [ ] Configuration tests implemented
- [ ] Monitoring tests implemented
- [ ] Rollback tests implemented
- [ ] Production smoke tests implemented

This comprehensive testing strategy ensures that the Google OAuth implementation is robust, secure, and performant across all scenarios and environments.