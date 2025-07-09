import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { UnsubscribeService } from '../../../lib/email/unsubscribe-service';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { token } = await request.json();

    // Validate input
    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing unsubscribe token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);
    const unsubscribeService = new UnsubscribeService(locals.runtime.env, db);

    // Validate the unsubscribe token
    const tokenData = await db.validateUnsubscribeToken(token);
    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired unsubscribe token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user agent and IP for tracking
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    // Process the unsubscribe request
    const result = await unsubscribeService.processUnsubscribe(
      token,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    await db.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);

    // Get the user to return confirmation details
    const user = await db.getUserById(tokenData.userId);
    
    return new Response(
      JSON.stringify({
        message: 'Successfully unsubscribed from all email notifications',
        user: user ? {
          email: user.email,
          username: user.username
        } : null,
        tokenType: tokenData.tokenType,
        processedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process unsubscribe request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};