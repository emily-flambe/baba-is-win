// Mock Google OAuth service for testing

export interface MockGoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface MockGoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export class MockGoogleOAuthService {
  private validCodes = new Set<string>();
  private validTokens = new Set<string>();
  private userProfiles = new Map<string, MockGoogleUserInfo>();

  constructor() {
    // Add some default test data
    this.addValidCode('4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz');
    this.addValidCode('4/0AX4XfWiAnotherValidCode123456789abcdefghijklmnopqrstuvwxyz');
    
    this.addUserProfile('mock-user-1', {
      id: 'mock-user-1',
      email: 'test@example.com',
      verified_email: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg',
      locale: 'en'
    });
  }

  addValidCode(code: string): void {
    this.validCodes.add(code);
  }

  addUserProfile(userId: string, profile: MockGoogleUserInfo): void {
    this.userProfiles.set(userId, profile);
  }

  async exchangeCodeForToken(code: string): Promise<MockGoogleTokenResponse> {
    if (!this.validCodes.has(code)) {
      throw new Error('Invalid authorization code');
    }

    const accessToken = this.generateMockToken();
    const refreshToken = this.generateMockToken();
    
    this.validTokens.add(accessToken);
    this.validCodes.delete(code); // Codes are single-use

    return {
      access_token: accessToken,
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: 'openid email profile',
      token_type: 'Bearer',
      id_token: this.generateMockIdToken()
    };
  }

  async getUserInfo(accessToken: string): Promise<MockGoogleUserInfo> {
    if (!this.validTokens.has(accessToken)) {
      throw new Error('Invalid access token');
    }

    // Return the first user profile for simplicity
    const profile = this.userProfiles.get('mock-user-1');
    if (!profile) {
      throw new Error('User profile not found');
    }

    return profile;
  }

  async revokeToken(token: string): Promise<void> {
    this.validTokens.delete(token);
  }

  private generateMockToken(): string {
    return 'mock_token_' + Math.random().toString(36).substr(2, 32);
  }

  private generateMockIdToken(): string {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'mock-user-1',
      aud: 'mock-client-id',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg',
      locale: 'en',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const signature = 'mock_signature';
    
    return `${header}.${payload}.${signature}`;
  }
}

// Global mock instance
export const mockGoogleOAuth = new MockGoogleOAuthService();

// Mock fetch responses for Google OAuth endpoints
export const mockGoogleOAuthFetch = (url: string, options?: RequestInit): Promise<Response> => {
  const mockUrl = new URL(url);
  
  // Token exchange endpoint
  if (mockUrl.pathname === '/oauth2/v4/token') {
    return handleTokenExchange(options);
  }
  
  // User info endpoint
  if (mockUrl.pathname === '/oauth2/v2/userinfo') {
    return handleUserInfo(options);
  }
  
  // Token revocation endpoint
  if (mockUrl.pathname === '/oauth2/v1/revoke') {
    return handleTokenRevocation(options);
  }
  
  return Promise.reject(new Error(`Mock endpoint not found: ${url}`));
};

async function handleTokenExchange(options?: RequestInit): Promise<Response> {
  if (!options || !options.body) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const formData = new URLSearchParams(options.body.toString());
  const code = formData.get('code');
  
  if (!code) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const tokenResponse = await mockGoogleOAuth.exchangeCodeForToken(code);
    return new Response(JSON.stringify(tokenResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUserInfo(options?: RequestInit): Promise<Response> {
  const authHeader = options?.headers?.['Authorization'] || options?.headers?.['authorization'];
  
  if (!authHeader || typeof authHeader !== 'string') {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');
  
  try {
    const userInfo = await mockGoogleOAuth.getUserInfo(accessToken);
    return new Response(JSON.stringify(userInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleTokenRevocation(options?: RequestInit): Promise<Response> {
  const formData = new URLSearchParams(options?.body?.toString() || '');
  const token = formData.get('token');
  
  if (!token) {
    return new Response('', { status: 400 });
  }

  await mockGoogleOAuth.revokeToken(token);
  return new Response('', { status: 200 });
}