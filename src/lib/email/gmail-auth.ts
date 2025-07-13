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
    console.log('[Gmail Auth] Checking token validity...');
    
    // Check cached token with 1-minute buffer
    if (this.tokenCache && this.tokenCache.expires_at > Date.now() + 60000) {
      console.log('[Gmail Auth] Using cached access token, expires at:', new Date(this.tokenCache.expires_at));
      console.log('[Gmail Auth] Token prefix:', this.tokenCache.access_token.substring(0, 20) + '...');
      return this.tokenCache.access_token;
    }
    
    console.log('[Gmail Auth] Token cache expired or missing, refreshing token...');
    if (this.tokenCache) {
      console.log('[Gmail Auth] Cached token expired at:', new Date(this.tokenCache.expires_at));
    }
    
    // Refresh token if needed
    const accessToken = await this.refreshAccessToken();
    
    // Cache with 55-minute expiration (tokens expire in 1 hour)
    this.tokenCache = {
      access_token: accessToken,
      expires_at: Date.now() + 3300000 // 55 minutes
    };
    
    console.log('[Gmail Auth] Token refreshed successfully, new expiration:', new Date(this.tokenCache.expires_at));
    console.log('[Gmail Auth] New token prefix:', accessToken.substring(0, 20) + '...');
    
    return accessToken;
  }
  
  private async refreshAccessToken(): Promise<string> {
    console.log('[Gmail Auth] Requesting new access token from Google OAuth2...');
    console.log('[Gmail Auth] Client ID prefix:', this.env.GMAIL_CLIENT_ID?.substring(0, 20) + '...');
    console.log('[Gmail Auth] Client secret available:', !!this.env.GMAIL_CLIENT_SECRET);
    console.log('[Gmail Auth] Refresh token available:', !!this.env.GMAIL_REFRESH_TOKEN);
    console.log('[Gmail Auth] Refresh token prefix:', this.env.GMAIL_REFRESH_TOKEN?.substring(0, 20) + '...');
    
    const requestBody = new URLSearchParams({
      client_id: this.env.GMAIL_CLIENT_ID,
      client_secret: this.env.GMAIL_CLIENT_SECRET,
      refresh_token: this.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    });
    
    console.log('[Gmail Auth] Making token refresh request to Google OAuth2 endpoint...');
    
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody
      });

      console.log('[Gmail Auth] Token refresh response status:', response.status);
      console.log('[Gmail Auth] Token refresh response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gmail Auth] Token refresh failed - Response body:', errorText);
        console.error('[Gmail Auth] Token refresh failed - Status:', response.status);
        console.error('[Gmail Auth] Token refresh failed - Status text:', response.statusText);
        
        // Try to parse JSON error response
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
          console.error('[Gmail Auth] Parsed error response:', parsedError);
        } catch (parseError) {
          console.error('[Gmail Auth] Could not parse error response as JSON');
        }
        
        const errorStack = new Error().stack;
        console.error('[Gmail Auth] Token refresh error stack trace:', errorStack);
        
        throw new Error(`OAuth token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json() as TokenResponse;
      console.log('[Gmail Auth] Token refresh successful, expires in:', tokenData.expires_in, 'seconds');
      console.log('[Gmail Auth] New access token prefix:', tokenData.access_token?.substring(0, 20) + '...');
      console.log('[Gmail Auth] Token type:', tokenData.token_type);
      
      return tokenData.access_token;
      
    } catch (error) {
      console.error('[Gmail Auth] Token refresh caught exception:', error);
      console.error('[Gmail Auth] Exception stack trace:', error.stack);
      console.error('[Gmail Auth] Exception name:', error.name);
      console.error('[Gmail Auth] Exception message:', error.message);
      throw error;
    }
  }
  
  async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<string> {
    console.log('[Gmail Send] Starting email send process...');
    console.log('[Gmail Send] Recipient:', to);
    console.log('[Gmail Send] Subject:', subject);
    console.log('[Gmail Send] Sender email:', this.env.GMAIL_SENDER_EMAIL);
    console.log('[Gmail Send] Site name:', this.env.SITE_NAME);
    console.log('[Gmail Send] HTML content length:', htmlContent?.length || 0);
    console.log('[Gmail Send] Text content length:', textContent?.length || 0);
    
    const accessToken = await this.getValidAccessToken();
    console.log('[Gmail Send] Using access token prefix:', accessToken.substring(0, 20) + '...');
    
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
    
    console.log('[Gmail Send] Email content length:', emailContent.length);
    console.log('[Gmail Send] Email headers preview:', emailContent.substring(0, 500));
    
    // Base64 encode for Gmail API (URL-safe)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(emailContent);
    console.log('[Gmail Send] Encoded bytes length:', bytes.length);
    
    const encodedMessage = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log('[Gmail Send] Base64 encoded message length:', encodedMessage.length);
    console.log('[Gmail Send] Encoded message preview:', encodedMessage.substring(0, 100) + '...');
    
    const requestPayload = { raw: encodedMessage };
    console.log('[Gmail Send] Request payload size:', JSON.stringify(requestPayload).length);
    
    // Send via Gmail API
    console.log('[Gmail Send] Making Gmail API request to send message...');
    
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      console.log('[Gmail Send] Gmail API response status:', response.status);
      console.log('[Gmail Send] Gmail API response status text:', response.statusText);
      console.log('[Gmail Send] Gmail API response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle 401 errors with automatic retry
      if (response.status === 401) {
        console.warn('[Gmail Send] Access token expired (401), clearing cache and retrying...');
        console.log('[Gmail Send] Original token prefix that failed:', accessToken.substring(0, 20) + '...');
        this.tokenCache = null;
        return this.sendEmail(to, subject, htmlContent, textContent);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gmail Send] Gmail API error - Status:', response.status);
        console.error('[Gmail Send] Gmail API error - Status text:', response.statusText);
        console.error('[Gmail Send] Gmail API error - Response body:', errorText);
        console.error('[Gmail Send] Gmail API error - Request details:', {
          url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
            'Content-Type': 'application/json'
          },
          bodyLength: JSON.stringify(requestPayload).length
        });
        
        // Try to parse JSON error response
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
          console.error('[Gmail Send] Parsed Gmail API error:', parsedError);
          if (parsedError.error) {
            console.error('[Gmail Send] Error code:', parsedError.error.code);
            console.error('[Gmail Send] Error message:', parsedError.error.message);
            console.error('[Gmail Send] Error status:', parsedError.error.status);
            if (parsedError.error.details) {
              console.error('[Gmail Send] Error details:', parsedError.error.details);
            }
          }
        } catch (parseError) {
          console.error('[Gmail Send] Could not parse Gmail API error response as JSON');
        }
        
        const errorStack = new Error().stack;
        console.error('[Gmail Send] Error stack trace:', errorStack);
        
        throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[Gmail Send] Gmail API success response:', result);
      console.log('[Gmail Send] Email sent successfully, message ID:', result.id);
      console.log('[Gmail Send] Message thread ID:', result.threadId);
      
      return result.id; // Gmail message ID
      
    } catch (error) {
      console.error('[Gmail Send] Exception during Gmail API call:', error);
      console.error('[Gmail Send] Exception stack trace:', error.stack);
      console.error('[Gmail Send] Exception name:', error.name);
      console.error('[Gmail Send] Exception message:', error.message);
      console.error('[Gmail Send] Request context:', {
        recipient: to,
        subject: subject,
        tokenPrefix: accessToken.substring(0, 20) + '...',
        contentLengths: {
          html: htmlContent?.length || 0,
          text: textContent?.length || 0,
          total: emailContent.length,
          encoded: encodedMessage.length
        }
      });
      throw error;
    }
  }
}