import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';

export const GET: APIRoute = async ({ request, locals }) => {
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

    const db = new AuthDB(locals.runtime.env.DB);
    
    // Get various notification counts
    const pendingNotifications = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_notifications WHERE status = 'pending'
    `).first();
    
    const sentNotifications = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_notifications WHERE status = 'sent'
    `).first();
    
    const failedNotifications = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed'
    `).first();
    
    // Get unnotified content
    const unnotifiedContent = await db.getUnnotifiedContent();
    
    // Get recent notifications
    const recentNotifications = await locals.runtime.env.DB.prepare(`
      SELECT * FROM email_notifications 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();
    
    // Get subscriber count
    const subscribers = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE email_verified = 1 
      AND (email_blog_updates = 1 OR email_thought_updates = 1)
    `).first();
    
    const response = {
      summary: {
        pending: pendingNotifications?.count || 0,
        sent: sentNotifications?.count || 0,
        failed: failedNotifications?.count || 0,
        subscribers: subscribers?.count || 0,
        unnotifiedContent: unnotifiedContent.length
      },
      unnotifiedContent: unnotifiedContent.map(c => ({
        id: c.id,
        slug: c.slug,
        type: c.contentType,
        title: c.title,
        notificationSent: c.notificationSent
      })),
      recentNotifications: recentNotifications.results.map(n => ({
        id: n.id,
        userId: n.user_id,
        contentType: n.content_type,
        contentId: n.content_id,
        status: n.status,
        createdAt: new Date(n.created_at * 1000).toISOString(),
        sentAt: n.sent_at ? new Date(n.sent_at * 1000).toISOString() : null,
        error: n.error_message
      }))
    };
    
    return new Response(
      JSON.stringify(response, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Check Notifications] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};