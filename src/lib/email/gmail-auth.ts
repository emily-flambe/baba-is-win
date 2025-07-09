import type { Env } from '../../types/env';

interface TokenCache {
  access_token: string;
  expires_at: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class GmailAuth {
  private tokenCache: TokenCache | null = null;
  
  constructor(private env: Env) {}
  
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
      expires_at: Date.now() + 3300000 // 55 minutes
    };
    
    return accessToken;
  }
  
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
  
  async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<string> {
    const accessToken = await this.getValidAccessToken();
    
    // Create RFC 2822 compliant email
    const emailContent = [
      `To: ${to}`,
      `From: ${this.env.SITE_NAME} <${this.env.GMAIL_SENDER_EMAIL}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="boundary123"`,
      ``,
      `--boundary123`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      textContent,
      ``,
      `--boundary123`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlContent,
      ``,
      `--boundary123--`
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
      return this.sendEmail(to, subject, htmlContent, textContent);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result.id; // Gmail message ID
  }
}