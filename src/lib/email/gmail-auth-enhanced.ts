import type { Env } from '../../types/env';
import { EmailEventLogger } from '../monitoring/email-event-logger';
import { AuthDB } from '../auth/db';

interface TokenCache {
  access_token: string;
  expires_at: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class GmailAuthEnhanced {
  private tokenCache: TokenCache | null = null;
  private eventLogger: EmailEventLogger;
  
  constructor(
    private env: Env,
    authDB: AuthDB,
    correlationId?: string
  ) {
    this.eventLogger = new EmailEventLogger(env, authDB, correlationId);
  }
  
  async getValidAccessToken(): Promise<string> {
    const operationName = 'gmail_get_valid_token';
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('auth', operationName, {
        operationDetails: {
          cacheStatus: this.tokenCache ? 'exists' : 'empty',
          cacheExpiry: this.tokenCache?.expires_at
        }
      });
      
      // Check cached token with 1-minute buffer
      if (this.tokenCache && this.tokenCache.expires_at > Date.now() + 60000) {
        await this.eventLogger.logGmailAuth('token_cache_hit', true, {
          expiresAt: this.tokenCache.expires_at,
          timeToExpiry: this.tokenCache.expires_at - Date.now()
        });
        
        await this.eventLogger.logSuccess('auth', operationName, {
          operationDetails: { source: 'cache' }
        });
        
        return this.tokenCache.access_token;
      }
      
      // Refresh token if needed
      const accessToken = await this.refreshAccessToken();
      
      // Cache with 55-minute expiration (tokens expire in 1 hour)
      this.tokenCache = {
        access_token: accessToken,
        expires_at: Date.now() + 3300000 // 55 minutes
      };
      
      await this.eventLogger.logSuccess('auth', operationName, {
        operationDetails: { 
          source: 'refresh',
          cacheExpiry: this.tokenCache.expires_at
        }
      });
      
      return accessToken;
      
    } catch (error) {
      await this.eventLogger.logFailure('auth', operationName, error as Error, 'auth');
      throw error;
    }
  }
  
  private async refreshAccessToken(): Promise<string> {
    const operationName = 'gmail_refresh_token';
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('auth', operationName);
      
      const requestPayload = {
        client_id: this.env.GMAIL_CLIENT_ID,
        grant_type: 'refresh_token',
        // Note: client_secret and refresh_token will be sanitized in logs
        client_secret: this.env.GMAIL_CLIENT_SECRET,
        refresh_token: this.env.GMAIL_REFRESH_TOKEN
      };
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(requestPayload)
      });

      const responseData = await response.json() as TokenResponse;
      
      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseBody: responseData
        };
        
        await this.eventLogger.logGmailAuth('token_refresh', false, errorDetails, 
          new Error(`OAuth token refresh failed: ${response.status} - ${JSON.stringify(responseData)}`));
        
        throw new Error(`OAuth token refresh failed: ${response.status} - ${JSON.stringify(responseData)}`);
      }

      await this.eventLogger.logGmailAuth('token_refresh', true, {
        tokenType: responseData.token_type,
        expiresIn: responseData.expires_in,
        status: response.status
      });
      
      await this.eventLogger.logSuccess('auth', operationName, {
        responsePayload: {
          token_type: responseData.token_type,
          expires_in: responseData.expires_in
        }
      });
      
      return responseData.access_token;
      
    } catch (error) {
      await this.eventLogger.logFailure('auth', operationName, error as Error, 'auth', {
        operationDetails: {
          endpoint: 'https://oauth2.googleapis.com/token'
        }
      });
      throw error;
    }
  }
  
  async sendEmail(
    to: string, 
    subject: string, 
    htmlContent: string, 
    textContent: string,
    correlationId?: string
  ): Promise<string> {
    if (correlationId) {
      this.eventLogger = new EmailEventLogger(this.env, this.eventLogger['authDB'], correlationId);
    }
    
    const operationName = 'gmail_send_email';
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('send', operationName, {
        recipientEmail: to,
        emailSubject: subject,
        operationDetails: {
          hasHtmlContent: !!htmlContent,
          hasTextContent: !!textContent,
          htmlLength: htmlContent?.length || 0,
          textLength: textContent?.length || 0
        }
      });
      
      // Get access token with event logging
      const accessToken = await this.getValidAccessToken();
      
      // Create RFC 2822 compliant email
      const emailContent = [
        `To: ${to}`,
        `From: Emily Cogsdill <${this.env.GMAIL_SENDER_EMAIL}>`,
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
      
      const requestPayload = { raw: encodedMessage };
      
      await this.eventLogger.logAttempt('api_request', 'gmail_api_send', {
        recipientEmail: to,
        emailSubject: subject,
        operationDetails: {
          emailSizeBytes: emailContent.length,
          encodedSizeBytes: encodedMessage.length
        }
      });
      
      // Send via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      // Handle 401 errors with automatic retry
      if (response.status === 401) {
        await this.eventLogger.logRetry('send', operationName, 1, {
          recipientEmail: to,
          errorMessage: 'Access token expired, retrying with fresh token',
          operationDetails: { retryReason: 'token_expired' }
        });
        
        this.tokenCache = null;
        return this.sendEmail(to, subject, htmlContent, textContent, correlationId);
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseBody: result
        };
        
        await this.eventLogger.logGmailSend(false, to, subject, undefined, 
          new Error(`Gmail API error: ${response.status} - ${JSON.stringify(result)}`),
          requestPayload, result);
        
        throw new Error(`Gmail API error: ${response.status} - ${JSON.stringify(result)}`);
      }
      
      const messageId = result.id;
      
      await this.eventLogger.logGmailSend(true, to, subject, messageId, undefined, 
        { emailSizeBytes: emailContent.length }, { messageId, status: response.status });
      
      await this.eventLogger.logSuccess('send', operationName, {
        recipientEmail: to,
        emailSubject: subject,
        gmailMessageId: messageId,
        operationDetails: {
          messageId,
          status: response.status
        }
      });
      
      return messageId;
      
    } catch (error) {
      await this.eventLogger.logFailure('send', operationName, error as Error, 'api', {
        recipientEmail: to,
        emailSubject: subject,
        operationDetails: {
          endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        }
      });
      throw error;
    }
  }
  
  /**
   * Get the correlation ID for this Gmail auth instance
   */
  getCorrelationId(): string {
    return this.eventLogger.getCorrelationId();
  }
  
  /**
   * Get event logger for external use
   */
  getEventLogger(): EmailEventLogger {
    return this.eventLogger;
  }
}