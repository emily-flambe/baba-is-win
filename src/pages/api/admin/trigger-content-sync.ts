import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { EmailNotificationService } from '../../../lib/email/notification-service';
import { ContentProcessor } from '../../../lib/email/content-processor';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Verify authorization - support both x-cron-secret header and Bearer token
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
    const notificationService = new EmailNotificationService(locals.runtime.env, db);
    const contentProcessor = new ContentProcessor(locals.runtime.env, db, notificationService);

    const startTime = Date.now();

    // Sync content and process new notifications
    await contentProcessor.syncContentFromFiles();
    await contentProcessor.processNewContent();
    
    const unnotifiedContent = await db.getUnnotifiedContent();
    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content sync and notifications triggered',
        stats: {
          newContent: unnotifiedContent.length,
          processingTime
        },
        triggeredAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in trigger-content-sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to trigger content sync',
        message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};