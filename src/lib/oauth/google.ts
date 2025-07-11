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
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale?: string;
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