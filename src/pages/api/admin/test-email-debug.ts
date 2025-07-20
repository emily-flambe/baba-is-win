import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { ResendEmailService } from '../../../lib/email/resend-service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authorization - support both x-cron-secret header and Bearer token
    const cronSecret = request.headers.get('x-cron-secret');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (cronSecret !== locals.runtime.env.CRON_SECRET && token !== locals.runtime.env.CRON_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { to, subject, debug } = await request.json();
    
    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Missing recipient email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Test Email Debug] Starting test email send:', { to, subject });
    
    // Initialize services
    const db = new AuthDB(locals.runtime.env.DB);
    const emailService = new ResendEmailService(locals.runtime.env);
    
    // Debug: Check if API key exists
    const hasApiKey = !!locals.runtime.env.RESEND_API_KEY;
    console.log('[Test Email Debug] RESEND_API_KEY exists:', hasApiKey);
    
    if (!hasApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured',
          debug: 'Run: wrangler secret put RESEND_API_KEY'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Debug: Log API key prefix (safe to log first few chars)
    console.log('[Test Email Debug] API Key prefix:', locals.runtime.env.RESEND_API_KEY.substring(0, 7) + '...');
    
    // Debug: Check from email
    const fromEmail = locals.runtime.env.RESEND_FROM_EMAIL || 'Emily\'s Blog <noreply@emilycogsdill.com>';
    console.log('[Test Email Debug] From email:', fromEmail);
    
    // Prepare test email
    const testHtml = `
      <h1>Test Email from Baba Is Win</h1>
      <p>This is a test email sent at ${new Date().toISOString()}</p>
      <p>If you received this, your email configuration is working!</p>
      <hr>
      <p>Debug Information:</p>
      <ul>
        <li>Sent to: ${to}</li>
        <li>From: ${fromEmail}</li>
        <li>Environment: ${locals.runtime.env.ENVIRONMENT || 'production'}</li>
        <li>Worker URL: ${locals.runtime.env.SITE_URL}</li>
      </ul>
    `;
    
    const testText = `Test Email from Baba Is Win
    
This is a test email sent at ${new Date().toISOString()}

If you received this, your email configuration is working!

Debug Information:
- Sent to: ${to}
- From: ${fromEmail}
- Environment: ${locals.runtime.env.ENVIRONMENT || 'production'}
- Worker URL: ${locals.runtime.env.SITE_URL}
`;
    
    console.log('[Test Email Debug] Calling Resend API...');
    
    // Send test email
    const result = await emailService.sendEmail({
      to,
      subject: subject || 'Test Email from Baba Is Win',
      html: testHtml,
      text: testText
    });
    
    console.log('[Test Email Debug] Resend API response:', result);
    
    // Return detailed response
    const response = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      debug: debug ? {
        hasApiKey,
        apiKeyPrefix: locals.runtime.env.RESEND_API_KEY.substring(0, 7) + '...',
        fromEmail,
        timestamp: new Date().toISOString(),
        environment: locals.runtime.env.ENVIRONMENT || 'production',
        siteUrl: locals.runtime.env.SITE_URL
      } : undefined
    };
    
    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[Test Email Debug] Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};