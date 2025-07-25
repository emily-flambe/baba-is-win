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
    console.log(`[Resend] ===== RESEND API CALL START =====`);
    console.log(`[Resend] To: ${params.to}`);
    console.log(`[Resend] Subject: ${params.subject}`);
    console.log(`[Resend] API Endpoint: ${this.apiEndpoint}`);
    console.log(`[Resend] Has API Key: ${!!this.env.RESEND_API_KEY}`);
    console.log(`[Resend] API Key prefix: ${this.env.RESEND_API_KEY?.substring(0, 10)}...`);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.env.RESEND_FROM_EMAIL || 'Emily <emily@emilycogsdill.com>',
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          headers: {
            ...params.headers,
            'List-Unsubscribe': `<${this.env.SITE_URL}/unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
            'X-Entity-Ref-ID': `${Date.now()}-${params.to}`,
            'Reply-To': 'emily@emilycogsdill.com'
          }
        })
      });
      
      console.log(`[Resend] Fetch completed, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Resend] Email send failed with status:', response.status);
        console.error('[Resend] Error response body:', errorText);
        
        let error: ResendErrorResponse;
        try {
          error = JSON.parse(errorText) as ResendErrorResponse;
        } catch {
          error = { message: errorText, statusCode: response.status };
        }
        
        console.log(`[Resend] ===== RESEND API CALL END (FAILED) =====`);
        return {
          success: false,
          error: `Resend API error: ${error.message} (${error.statusCode})`
        };
      }

      const result = await response.json() as ResendEmailResponse;
      console.log('[Resend] Email sent successfully:', result.id);
      console.log(`[Resend] ===== RESEND API CALL END (SUCCESS) =====`);
      
      return {
        success: true,
        messageId: result.id
      };
    } catch (error) {
      console.error('[Resend] Email send error:', error);
      console.error('[Resend] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.log(`[Resend] ===== RESEND API CALL END (EXCEPTION) =====`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}