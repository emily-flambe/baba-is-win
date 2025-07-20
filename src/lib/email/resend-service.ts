import type { Env } from '../../types/env';

interface ResendEmailResponse {
  id: string;
  from: string;
  to: string;
  created_at: string;
}

interface ResendErrorResponse {
  name: string;
  message: string;
  statusCode: number;
}

export class ResendEmailService {
  private readonly apiEndpoint = 'https://api.resend.com/emails';
  
  constructor(private env: Env) {}
  
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.env.RESEND_FROM_EMAIL || 'Emily\'s Blog <noreply@emilycogsdill.com>',
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          headers: params.headers
        })
      });

      if (!response.ok) {
        const error = await response.json() as ResendErrorResponse;
        console.error('[Resend] Email send failed:', error);
        return {
          success: false,
          error: `Resend API error: ${error.message} (${error.statusCode})`
        };
      }

      const result = await response.json() as ResendEmailResponse;
      console.log('[Resend] Email sent successfully:', result.id);
      
      return {
        success: true,
        messageId: result.id
      };
    } catch (error) {
      console.error('[Resend] Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}