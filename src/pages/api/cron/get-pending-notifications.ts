import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Verify authorization
    const cronSecret = request.headers.get('x-cron-secret');
    
    if (cronSecret !== locals.runtime.env.CRON_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);
    
    // Get all unnotified content
    const unnotifiedContent = await db.getUnnotifiedContent();
    
    // Transform to simpler format for GitHub Action consumption
    const pendingNotifications = unnotifiedContent.map(content => ({
      id: content.id,
      slug: content.slug,
      type: content.contentType,
      title: content.title,
      createdAt: content.createdAt
    }));

    return new Response(
      JSON.stringify({
        success: true,
        count: pendingNotifications.length,
        notifications: pendingNotifications
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-pending-notifications:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};