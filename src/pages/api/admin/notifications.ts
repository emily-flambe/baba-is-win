import type { APIRoute } from 'astro';
import { verifyJWT } from '../../../lib/auth/jwt';
import { AuthDB } from '../../../lib/auth/db';
import { EmailNotificationService } from '../../../lib/email/notification-service';
import { ContentProcessor } from '../../../lib/email/content-processor';

export const prerender = false;

// Helper function to extract user from JWT token and verify admin access
async function getAdminUserFromToken(request: Request, env: any): Promise<any> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const token = cookieHeader
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];

  if (!token) {
    return null;
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return null;
  }

  const db = new AuthDB(env.DB);
  const user = await db.getUserById(payload.sub);
  
  // Check if user is admin (you may need to adjust this based on your user model)
  // For now, we'll assume admin check is based on email or username
  if (!user || (!user.email.includes('admin') && !user.username.includes('admin'))) {
    return null;
  }
  
  return user;
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = new AuthDB(locals.runtime.env.DB);

    // Get subscriber counts by content type (public information)
    const blogSubscribers = await db.getSubscribersForContentType('blog');
    const thoughtSubscribers = await db.getSubscribersForContentType('thought');
    const announcementSubscribers = await db.getSubscribersForContentType('announcement');

    const subscriberStats = {
      blog: blogSubscribers.length,
      thought: thoughtSubscribers.length,
      announcement: announcementSubscribers.length,
      total: new Set([...blogSubscribers, ...thoughtSubscribers, ...announcementSubscribers].map(u => u.id)).size
    };

    return new Response(
      JSON.stringify({
        subscriberStats
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch notifications' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const adminUser = await getAdminUserFromToken(request, locals.runtime.env);
    
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { action, contentId, contentType, force } = body;

    // Validate input
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);
    const notificationService = new EmailNotificationService(locals.runtime.env, db);
    const contentProcessor = new ContentProcessor(locals.runtime.env, db, notificationService);

    let result;

    switch (action) {
      case 'send_notification':
        if (!contentId || !contentType) {
          return new Response(
            JSON.stringify({ error: 'Content ID and type are required for sending notifications' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Get content item
        const content = await db.getContentItemBySlug(contentId);
        if (!content) {
          return new Response(
            JSON.stringify({ error: 'Content not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Check if notification already sent (unless force is true)
        if (content.notificationSent && !force) {
          return new Response(
            JSON.stringify({ error: 'Notification already sent for this content' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Send notification based on content type using ContentProcessor
        try {
          await contentProcessor.triggerNotificationForContent(content.slug, contentType);
        } catch (error) {
          console.error(`Failed to trigger notification for ${contentType} ${content.slug}:`, error);
          return new Response(
            JSON.stringify({ error: `Failed to send notification: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Mark content as notified
        await db.markContentNotified(content.id);

        result = {
          message: `Notification sent successfully for ${contentType}: ${content.title}`,
          contentId: content.id,
          contentType: contentType,
          notificationSent: true
        };
        break;

      case 'retry_failed':
        // Process failed notifications for retry
        await notificationService.processFailedNotifications();
        result = {
          message: 'Failed notifications processed for retry'
        };
        break;

      case 'get_stats':
        // Get fresh stats
        const stats = await notificationService.getNotificationStats();
        result = { stats };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing admin notification request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process notification request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};