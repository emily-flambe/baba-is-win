# Google OAuth Technical Implementation Specification

## Overview

This document provides a comprehensive technical specification for implementing Google OAuth authentication in the Baba Is Win application. The implementation extends the existing JWT-based authentication system to support Google OAuth while maintaining backward compatibility.

## Architecture Overview

### Current System Analysis
- **Framework**: Astro with Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Auth Method**: JWT tokens with PBKDF2 password hashing
- **Session Management**: HTTP-only cookies with 7-day expiration
- **Existing Routes**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/me`

### OAuth Integration Strategy
- **Hybrid Authentication**: Support both email/password and OAuth
- **Account Linking**: Allow users to link OAuth accounts to existing accounts
- **Unified Session Management**: Use existing JWT system for all authenticated users
- **Database Extension**: Add OAuth fields to existing users table

## Database Schema Changes

### 1. Users Table Modifications

```sql
-- Add OAuth fields to existing users table
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_email TEXT;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Add indexes for OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_provider_email ON users(provider_email);

-- Update existing users to set default provider
UPDATE users SET provider = 'email' WHERE provider IS NULL;
```

### 2. Schema Migration Strategy

```typescript
// src/lib/database/migrations/001_add_oauth_fields.ts
export async function up(db: D1Database) {
  await db.batch([
    db.prepare(`
      ALTER TABLE users ADD COLUMN google_id TEXT;
    `),
    db.prepare(`
      ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
    `),
    db.prepare(`
      ALTER TABLE users ADD COLUMN provider_email TEXT;
    `),
    db.prepare(`
      ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
    `),
    db.prepare(`
      ALTER TABLE users ADD COLUMN display_name TEXT;
    `),
    db.prepare(`
      CREATE INDEX idx_users_google_id ON users(google_id);
    `),
    db.prepare(`
      CREATE INDEX idx_users_provider ON users(provider);
    `),
    db.prepare(`
      CREATE INDEX idx_users_provider_email ON users(provider_email);
    `),
    db.prepare(`
      UPDATE users SET provider = 'email' WHERE provider IS NULL;
    `)
  ]);
}
```

## Implementation Files

### 1. OAuth Configuration (`src/lib/oauth/config.ts`)

```typescript
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export function getGoogleOAuthConfig(env: any): OAuthConfig {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI || 'http://localhost:8788/api/auth/google/callback',
    scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  };
}

export function generateAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  return `${config.authUrl}?${params.toString()}`;
}
```

### 2. OAuth Service (`src/lib/oauth/google.ts`)

```typescript
import { OAuthConfig } from './config';

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export class GoogleOAuthService {
  constructor(private config: OAuthConfig) {}

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(this.config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`User info fetch failed: ${error}`);
    }

    return response.json();
  }

  async verifyIdToken(idToken: string): Promise<any> {
    // Use Google's token verification endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!response.ok) {
      throw new Error('ID token verification failed');
    }

    const tokenInfo = await response.json();
    
    // Verify the token is for our application
    if (tokenInfo.aud !== this.config.clientId) {
      throw new Error('ID token audience mismatch');
    }

    return tokenInfo;
  }
}
```

### 3. User Management Extensions (`src/lib/auth/user-manager.ts`)

```typescript
import { GoogleUserInfo } from '../oauth/google';

export interface OAuthUserData {
  googleId: string;
  email: string;
  displayName: string;
  profilePictureUrl: string;
  providerEmail: string;
}

export class UserManager {
  constructor(private db: D1Database) {}

  async findUserByGoogleId(googleId: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE google_id = ?
    `).bind(googleId).first();

    return result;
  }

  async findUserByEmail(email: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();

    return result;
  }

  async createOAuthUser(userData: OAuthUserData): Promise<any> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();

    const result = await this.db.prepare(`
      INSERT INTO users (
        id, email, username, google_id, provider, provider_email,
        display_name, profile_picture_url, password_hash,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userData.email,
      userData.email, // Use email as username for OAuth users
      userData.googleId,
      'google',
      userData.providerEmail,
      userData.displayName,
      userData.profilePictureUrl,
      '', // Empty password hash for OAuth users
      timestamp,
      timestamp
    ).run();

    if (!result.success) {
      throw new Error('Failed to create OAuth user');
    }

    return this.findUserByGoogleId(userData.googleId);
  }

  async linkGoogleAccount(userId: string, userData: OAuthUserData): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE users 
      SET google_id = ?, provider_email = ?, display_name = ?, 
          profile_picture_url = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      userData.googleId,
      userData.providerEmail,
      userData.displayName,
      userData.profilePictureUrl,
      Date.now(),
      userId
    ).run();

    if (!result.success) {
      throw new Error('Failed to link Google account');
    }
  }

  async updateOAuthUser(googleId: string, userData: Partial<OAuthUserData>): Promise<void> {
    const updateFields = [];
    const values = [];

    if (userData.displayName) {
      updateFields.push('display_name = ?');
      values.push(userData.displayName);
    }

    if (userData.profilePictureUrl) {
      updateFields.push('profile_picture_url = ?');
      values.push(userData.profilePictureUrl);
    }

    if (updateFields.length === 0) return;

    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(googleId);

    const result = await this.db.prepare(`
      UPDATE users SET ${updateFields.join(', ')} WHERE google_id = ?
    `).bind(...values).run();

    if (!result.success) {
      throw new Error('Failed to update OAuth user');
    }
  }
}
```

### 4. State Management (`src/lib/oauth/state.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose';

export interface OAuthState {
  timestamp: number;
  returnUrl?: string;
  linkAccount?: boolean;
  userId?: string;
}

export class OAuthStateManager {
  private secret: Uint8Array;

  constructor(jwtSecret: string) {
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async createState(data: Partial<OAuthState>): Promise<string> {
    const payload = {
      timestamp: Date.now(),
      ...data
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m') // State expires in 10 minutes
      .sign(this.secret);

    return jwt;
  }

  async verifyState(state: string): Promise<OAuthState> {
    try {
      const { payload } = await jwtVerify(state, this.secret);
      return payload as OAuthState;
    } catch (error) {
      throw new Error('Invalid or expired OAuth state');
    }
  }
}
```

## API Endpoints Implementation

### 1. OAuth Initiation Endpoint (`src/pages/api/auth/google.ts`)

```typescript
import type { APIRoute } from 'astro';
import { getGoogleOAuthConfig, generateAuthUrl } from '../../../lib/oauth/config';
import { OAuthStateManager } from '../../../lib/oauth/state';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl') || '/';
    const linkAccount = url.searchParams.get('linkAccount') === 'true';

    const config = getGoogleOAuthConfig(locals.runtime.env);
    const stateManager = new OAuthStateManager(locals.runtime.env.JWT_SECRET);

    const stateData = {
      returnUrl,
      linkAccount,
      userId: locals.user?.id
    };

    const state = await stateManager.createState(stateData);
    const authUrl = generateAuthUrl(config, state);

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl
      }
    });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return new Response(JSON.stringify({ error: 'OAuth configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### 2. OAuth Callback Endpoint (`src/pages/api/auth/google/callback.ts`)

```typescript
import type { APIRoute } from 'astro';
import { GoogleOAuthService } from '../../../../lib/oauth/google';
import { getGoogleOAuthConfig } from '../../../../lib/oauth/config';
import { OAuthStateManager } from '../../../../lib/oauth/state';
import { UserManager } from '../../../../lib/auth/user-manager';
import { AuthService } from '../../../../lib/auth/auth-service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent(error)}`
        }
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/login?error=missing_parameters'
        }
      });
    }

    const config = getGoogleOAuthConfig(locals.runtime.env);
    const oauthService = new GoogleOAuthService(config);
    const stateManager = new OAuthStateManager(locals.runtime.env.JWT_SECRET);
    const userManager = new UserManager(locals.runtime.env.DB);
    const authService = new AuthService(locals.runtime.env.JWT_SECRET);

    // Verify state
    const stateData = await stateManager.verifyState(state);
    
    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(code);
    
    // Verify ID token
    await oauthService.verifyIdToken(tokens.id_token);
    
    // Get user info
    const userInfo = await oauthService.getUserInfo(tokens.access_token);

    if (!userInfo.verified_email) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/login?error=email_not_verified'
        }
      });
    }

    let user;
    let isLinking = false;

    // Check if this is account linking
    if (stateData.linkAccount && stateData.userId) {
      const existingUser = await userManager.findUserByGoogleId(userInfo.id);
      if (existingUser && existingUser.id !== stateData.userId) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: '/profile?error=account_already_linked'
          }
        });
      }

      await userManager.linkGoogleAccount(stateData.userId, {
        googleId: userInfo.id,
        email: userInfo.email,
        displayName: userInfo.name,
        profilePictureUrl: userInfo.picture,
        providerEmail: userInfo.email
      });

      user = await userManager.findUserById(stateData.userId);
      isLinking = true;
    } else {
      // Check if user exists by Google ID
      user = await userManager.findUserByGoogleId(userInfo.id);

      if (!user) {
        // Check if user exists by email
        const existingUser = await userManager.findUserByEmail(userInfo.email);
        
        if (existingUser) {
          // Email exists but not linked to Google account
          return new Response(null, {
            status: 302,
            headers: {
              Location: `/login?error=email_exists&email=${encodeURIComponent(userInfo.email)}`
            }
          });
        }

        // Create new user
        user = await userManager.createOAuthUser({
          googleId: userInfo.id,
          email: userInfo.email,
          displayName: userInfo.name,
          profilePictureUrl: userInfo.picture,
          providerEmail: userInfo.email
        });
      } else {
        // Update existing OAuth user info
        await userManager.updateOAuthUser(userInfo.id, {
          displayName: userInfo.name,
          profilePictureUrl: userInfo.picture
        });
      }
    }

    // Create session
    const sessionToken = await authService.createSession(user);
    
    // Set cookie
    const cookie = authService.createCookie(sessionToken);
    
    const returnUrl = stateData.returnUrl || (isLinking ? '/profile' : '/');
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: returnUrl,
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login?error=oauth_failed'
      }
    });
  }
};
```

## Frontend Implementation

### 1. OAuth Button Component (`src/components/auth/GoogleOAuthButton.astro`)

```astro
---
interface Props {
  mode: 'login' | 'signup' | 'link';
  returnUrl?: string;
  class?: string;
}

const { mode, returnUrl, class: className } = Astro.props;

const buttonText = {
  login: 'Continue with Google',
  signup: 'Sign up with Google',
  link: 'Link Google Account'
};

const getOAuthUrl = (mode: string, returnUrl?: string) => {
  const params = new URLSearchParams();
  if (returnUrl) params.set('returnUrl', returnUrl);
  if (mode === 'link') params.set('linkAccount', 'true');
  return `/api/auth/google?${params.toString()}`;
};
---

<a 
  href={getOAuthUrl(mode, returnUrl)}
  class={`oauth-button oauth-button--google ${className || ''}`}
>
  <svg class="oauth-button__icon" viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  <span class="oauth-button__text">{buttonText[mode]}</span>
</a>

<style>
.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid #dadce0;
  border-radius: 0.5rem;
  background: white;
  color: #3c4043;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.oauth-button:hover {
  background: #f8f9fa;
  border-color: #d2d3d4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.oauth-button__icon {
  flex-shrink: 0;
}

.oauth-button__text {
  white-space: nowrap;
}
</style>
```

### 2. Updated Login Page (`src/pages/login.astro`)

```astro
---
import Layout from '../layouts/Layout.astro';
import GoogleOAuthButton from '../components/auth/GoogleOAuthButton.astro';

const url = new URL(Astro.request.url);
const error = url.searchParams.get('error');
const email = url.searchParams.get('email');
const returnUrl = url.searchParams.get('returnUrl') || '/';

const errorMessages = {
  email_exists: 'An account with this email already exists. Please log in with your password or link your Google account.',
  email_not_verified: 'Your Google account email is not verified. Please verify your email with Google.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  account_already_linked: 'This Google account is already linked to another user.',
  missing_parameters: 'Missing required parameters. Please try again.',
  invalid_credentials: 'Invalid email or password.',
  user_not_found: 'No account found with this email address.',
};
---

<Layout title="Login - Baba Is Win">
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">Sign In</h1>
      
      {error && (
        <div class="error-message">
          {errorMessages[error as keyof typeof errorMessages] || 'An error occurred. Please try again.'}
        </div>
      )}

      <div class="auth-methods">
        <GoogleOAuthButton mode="login" returnUrl={returnUrl} />
        
        <div class="auth-divider">
          <span>or</span>
        </div>

        <form class="auth-form" method="post" action="/api/auth/login">
          <input type="hidden" name="returnUrl" value={returnUrl} />
          
          <div class="form-group">
            <label for="email">Email or Username</label>
            <input 
              type="text" 
              id="email" 
              name="email" 
              required 
              value={email || ''}
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="auth-button">Sign In</button>
        </form>
      </div>

      <div class="auth-footer">
        <p>Don't have an account? <a href="/signup">Sign up</a></p>
      </div>
    </div>
  </div>
</Layout>

<style>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.auth-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.auth-title {
  text-align: center;
  margin-bottom: 2rem;
  color: #1f2937;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.auth-methods {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.auth-divider span {
  color: #6b7280;
  font-size: 0.875rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.auth-button {
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.auth-button:hover {
  background: #2563eb;
}

.auth-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.auth-footer a {
  color: #3b82f6;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
```

### 3. Updated Profile Page (`src/pages/profile.astro`)

```astro
---
import Layout from '../layouts/Layout.astro';
import GoogleOAuthButton from '../components/auth/GoogleOAuthButton.astro';

// This would come from your auth middleware
const user = Astro.locals.user;
const hasGoogleAccount = user?.google_id;

const url = new URL(Astro.request.url);
const error = url.searchParams.get('error');
const success = url.searchParams.get('success');
---

<Layout title="Profile - Baba Is Win">
  <div class="profile-container">
    <div class="profile-header">
      <h1>Profile</h1>
    </div>

    {error && (
      <div class="error-message">
        {error === 'account_already_linked' && 'This Google account is already linked to another user.'}
      </div>
    )}

    {success && (
      <div class="success-message">
        {success === 'account_linked' && 'Your Google account has been successfully linked!'}
      </div>
    )}

    <div class="profile-card">
      <div class="profile-section">
        <h2>Account Information</h2>
        
        <div class="profile-info">
          <div class="info-item">
            <label>Email</label>
            <span>{user.email}</span>
          </div>
          
          <div class="info-item">
            <label>Username</label>
            <span>{user.username}</span>
          </div>
          
          {user.display_name && (
            <div class="info-item">
              <label>Display Name</label>
              <span>{user.display_name}</span>
            </div>
          )}
          
          <div class="info-item">
            <label>Account Type</label>
            <span>{user.provider === 'google' ? 'Google Account' : 'Email Account'}</span>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <h2>Connected Accounts</h2>
        
        <div class="connected-accounts">
          {hasGoogleAccount ? (
            <div class="connected-account">
              <div class="account-info">
                <svg class="account-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <div>
                  <div class="account-name">Google</div>
                  <div class="account-email">{user.provider_email}</div>
                </div>
              </div>
              <span class="account-status">Connected</span>
            </div>
          ) : (
            <div class="connect-account">
              <div class="connect-info">
                <p>Link your Google account to sign in with Google</p>
              </div>
              <GoogleOAuthButton mode="link" class="connect-button" />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</Layout>

<style>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-header h1 {
  color: #1f2937;
  margin: 0;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.profile-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-section {
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.profile-section:last-child {
  border-bottom: none;
}

.profile-section h2 {
  margin: 0 0 1.5rem 0;
  color: #1f2937;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.info-item span {
  color: #1f2937;
}

.connected-accounts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.connected-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.account-icon {
  flex-shrink: 0;
}

.account-name {
  font-weight: 500;
  color: #1f2937;
}

.account-email {
  font-size: 0.875rem;
  color: #6b7280;
}

.account-status {
  font-size: 0.875rem;
  color: #059669;
  font-weight: 500;
}

.connect-account {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.connect-info p {
  margin: 0;
  color: #6b7280;
}

.connect-button {
  flex-shrink: 0;
}
</style>
```

## Error Handling and Edge Cases

### 1. Common Error Scenarios

```typescript
// src/lib/oauth/errors.ts
export enum OAuthErrorCode {
  INVALID_STATE = 'invalid_state',
  EXPIRED_STATE = 'expired_state',
  TOKEN_EXCHANGE_FAILED = 'token_exchange_failed',
  USER_INFO_FAILED = 'user_info_failed',
  EMAIL_NOT_VERIFIED = 'email_not_verified',
  ACCOUNT_ALREADY_LINKED = 'account_already_linked',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  INVALID_ID_TOKEN = 'invalid_id_token',
  MISSING_CREDENTIALS = 'missing_credentials',
  DATABASE_ERROR = 'database_error'
}

export class OAuthError extends Error {
  constructor(
    public code: OAuthErrorCode,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

export function handleOAuthError(error: unknown): string {
  if (error instanceof OAuthError) {
    switch (error.code) {
      case OAuthErrorCode.EMAIL_NOT_VERIFIED:
        return '/login?error=email_not_verified';
      case OAuthErrorCode.ACCOUNT_ALREADY_LINKED:
        return '/login?error=account_already_linked';
      case OAuthErrorCode.EMAIL_ALREADY_EXISTS:
        return '/login?error=email_exists';
      default:
        return '/login?error=oauth_failed';
    }
  }
  
  console.error('Unexpected OAuth error:', error);
  return '/login?error=oauth_failed';
}
```

### 2. Rate Limiting

```typescript
// src/lib/oauth/rate-limiter.ts
export class OAuthRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(clientId) || [];
    
    // Remove expired attempts
    const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return true;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(clientId, validAttempts);
    
    return false;
  }

  getRemainingAttempts(clientId: string): number {
    const attempts = this.attempts.get(clientId) || [];
    const validAttempts = attempts.filter(timestamp => Date.now() - timestamp < this.windowMs);
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
// src/lib/oauth/__tests__/google.test.ts
import { GoogleOAuthService } from '../google';
import { OAuthConfig } from '../config';

describe('GoogleOAuthService', () => {
  const mockConfig: OAuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:8788/api/auth/google/callback',
    scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  };

  let service: GoogleOAuthService;

  beforeEach(() => {
    service = new GoogleOAuthService(mockConfig);
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        id_token: 'mock-id-token',
        token_type: 'Bearer',
        scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.exchangeCodeForTokens('test-code');
      
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.tokenUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams)
        })
      );
    });

    it('should throw error on failed token exchange', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Invalid request')
      });

      await expect(service.exchangeCodeForTokens('invalid-code'))
        .rejects
        .toThrow('Token exchange failed: Invalid request');
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const mockUserInfo = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/picture.jpg',
        locale: 'en'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo)
      });

      const result = await service.getUserInfo('mock-access-token');
      
      expect(result).toEqual(mockUserInfo);
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.userInfoUrl,
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock-access-token'
          }
        })
      );
    });
  });
});
```

### 2. Integration Tests

```typescript
// src/lib/oauth/__tests__/integration.test.ts
import { UserManager } from '../../auth/user-manager';
import { GoogleOAuthService } from '../google';

describe('OAuth Integration', () => {
  let userManager: UserManager;
  let oauthService: GoogleOAuthService;

  beforeEach(() => {
    // Setup test database and services
    userManager = new UserManager(mockDatabase);
    oauthService = new GoogleOAuthService(mockConfig);
  });

  it('should create new user from OAuth data', async () => {
    const mockUserInfo = {
      id: '123456789',
      email: 'newuser@example.com',
      verified_email: true,
      name: 'New User',
      given_name: 'New',
      family_name: 'User',
      picture: 'https://example.com/picture.jpg',
      locale: 'en'
    };

    const user = await userManager.createOAuthUser({
      googleId: mockUserInfo.id,
      email: mockUserInfo.email,
      displayName: mockUserInfo.name,
      profilePictureUrl: mockUserInfo.picture,
      providerEmail: mockUserInfo.email
    });

    expect(user.google_id).toBe(mockUserInfo.id);
    expect(user.email).toBe(mockUserInfo.email);
    expect(user.provider).toBe('google');
    expect(user.display_name).toBe(mockUserInfo.name);
  });

  it('should link Google account to existing user', async () => {
    // Create existing user
    const existingUser = await userManager.createUser({
      email: 'existing@example.com',
      username: 'existing',
      password: 'password123'
    });

    const mockUserInfo = {
      id: '123456789',
      email: 'existing@example.com',
      verified_email: true,
      name: 'Existing User',
      given_name: 'Existing',
      family_name: 'User',
      picture: 'https://example.com/picture.jpg',
      locale: 'en'
    };

    await userManager.linkGoogleAccount(existingUser.id, {
      googleId: mockUserInfo.id,
      email: mockUserInfo.email,
      displayName: mockUserInfo.name,
      profilePictureUrl: mockUserInfo.picture,
      providerEmail: mockUserInfo.email
    });

    const updatedUser = await userManager.findUserById(existingUser.id);
    expect(updatedUser.google_id).toBe(mockUserInfo.id);
    expect(updatedUser.display_name).toBe(mockUserInfo.name);
  });
});
```

## Deployment Considerations

### 1. Environment Variables

```bash
# Development
GOOGLE_CLIENT_ID=your_development_client_id
GOOGLE_CLIENT_SECRET=your_development_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback

# Production
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

### 2. Database Migration

```sql
-- Migration script to be run via wrangler d1 execute
-- or through your migration system

-- Add OAuth fields to users table
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_email TEXT;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Create indexes for performance
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_provider_email ON users(provider_email);

-- Update existing users
UPDATE users SET provider = 'email' WHERE provider IS NULL;
```

### 3. Monitoring and Logging

```typescript
// src/lib/oauth/monitoring.ts
export class OAuthMonitoring {
  static logOAuthAttempt(provider: string, success: boolean, error?: string) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'oauth_attempt',
      provider,
      success,
      error: error || null
    }));
  }

  static logUserCreation(provider: string, userId: string) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'user_created',
      provider,
      userId
    }));
  }

  static logAccountLinking(userId: string, provider: string) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'account_linked',
      userId,
      provider
    }));
  }
}
```

## Security Considerations

### 1. State Token Security
- Use JWT with short expiration (10 minutes)
- Include timestamp and random nonce
- Verify state token on callback

### 2. ID Token Verification
- Verify token signature using Google's public keys
- Check audience matches your client ID
- Validate token expiration

### 3. Session Management
- Use existing secure JWT system
- Maintain same session expiration policies
- Implement proper logout for OAuth users

### 4. Rate Limiting
- Limit OAuth attempts per IP/user
- Implement exponential backoff
- Monitor for abuse patterns

## Implementation Checklist

- [ ] Database schema updated with OAuth fields
- [ ] Google OAuth service implemented
- [ ] State management system created
- [ ] API endpoints created (`/api/auth/google`, `/api/auth/google/callback`)
- [ ] User management extended for OAuth
- [ ] Frontend OAuth button component created
- [ ] Login/signup pages updated
- [ ] Profile page updated with account linking
- [ ] Error handling implemented
- [ ] Rate limiting added
- [ ] Tests written (unit and integration)
- [ ] Environment variables configured
- [ ] Google Cloud Console configured
- [ ] Monitoring and logging implemented
- [ ] Security review completed
- [ ] Documentation updated

This specification provides a comprehensive guide for implementing Google OAuth authentication while maintaining the existing system's security and functionality.