import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { SimpleEmailNotificationService } from '../../../lib/email/simple-notification-service';
import { ContentProcessor } from '../../../lib/email/content-processor';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Verify this is a legitimate cron request from GitHub Actions
    const cronSecret = request.headers.get('x-cron-secret');
    
    if (cronSecret !== locals.runtime.env.CRON_SECRET) {
      console.log('Unauthorized cron attempt - invalid secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized cron request' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);
    const notificationService = new SimpleEmailNotificationService(locals.runtime.env, db);
    const contentProcessor = new ContentProcessor(locals.runtime.env, db, notificationService);

    const processingResults = {
      contentSync: {
        processed: 0,
        newContent: 0,
        updated: 0,
        errors: []
      },
      notifications: {
        sent: 0,
        failed: 0,
        retried: 0,
        errors: []
      },
      cleanup: {
        expiredTokens: 0,
        oldNotifications: 0
      },
      totalProcessingTime: 0,
      debug: {
        logs: [],
        unnotifiedContent: [],
        notificationDetails: []
      }
    };
    
    // Helper to capture debug logs
    const debugLog = (message: string, data?: any) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`;
      console.log(logEntry, data || '');
      processingResults.debug.logs.push({ message: logEntry, data });
    };

    const startTime = Date.now();

    try {
      // 1. Content synchronization
      console.log('Starting content synchronization...');
      await contentProcessor.syncContentFromFiles();
      processingResults.contentSync = {
        processed: 1,
        newContent: 0,
        updated: 0,
        errors: []
      };

      // 2. Process new content notifications
      debugLog('Processing new content notifications...');
      const unnotifiedContent = await db.getUnnotifiedContent();
      debugLog(`Found ${unnotifiedContent.length} unnotified content items`);
      processingResults.debug.unnotifiedContent = unnotifiedContent.map(c => ({
        slug: c.slug,
        type: c.contentType,
        title: c.title
      }));
      
      // Get subscriber count
      const blogSubscribers = await db.getSubscribersForContentType('blog');
      const thoughtSubscribers = await db.getSubscribersForContentType('thought');
      debugLog(`Subscribers - Blog: ${blogSubscribers.length}, Thoughts: ${thoughtSubscribers.length}`);
      
      // Process new content notifications
      debugLog('Calling contentProcessor.processNewContent()...');
      await contentProcessor.processNewContent();
      
      // Check how many notifications were actually created
      const createdNotifications = await db.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications 
        WHERE created_at >= ?
      `).bind(Math.floor(startTime / 1000)).first();
      
      debugLog(`Notifications created in this run: ${createdNotifications?.count || 0}`);
      processingResults.notifications.sent = createdNotifications?.count || 0;

      // Get notification details for debugging
      const recentNotifications = await db.db.prepare(`
        SELECT id, user_id, content_type, content_id, status, error_message, email_message_id
        FROM email_notifications 
        WHERE created_at >= ?
        ORDER BY created_at DESC
        LIMIT 10
      `).bind(Math.floor(startTime / 1000)).all();
      
      debugLog(`Recent notifications:`, recentNotifications.results.map(n => ({
        id: n.id,
        status: n.status,
        has_message_id: !!n.email_message_id,
        error: n.error_message
      })));
      
      // 3. Process failed notifications for retry
      debugLog('Processing failed notifications for retry...');
      const now = Math.floor(Date.now() / 1000);
      
      const failedNotifications = await db.db.prepare(`
        SELECT * FROM email_notifications 
        WHERE status = 'failed' 
        AND retry_count < 3 
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
        ORDER BY created_at ASC
        LIMIT 100
      `).bind(now).all();

      for (const notification of failedNotifications.results) {
        try {
          // Get the content and user for retry
          const content = await db.getContentItemBySlug(notification.content_id);
          const user = await db.getUserById(notification.user_id);
          
          if (!content || !user) {
            continue;
          }

          // Retry sending the notification
          // Note: triggerNotificationForContent doesn't return success/failure
          // so we can't mark as sent here. The notification service will update status.
          if (notification.content_type === 'blog') {
            await contentProcessor.triggerNotificationForContent(content.slug, 'blog');
          } else if (notification.content_type === 'thought') {
            await contentProcessor.triggerNotificationForContent(content.slug, 'thought');
          }
          
          processingResults.notifications.retried++;
        } catch (error) {
          console.error(`Failed to retry notification ${notification.id}:`, error);
          
          // Update retry count and next retry time
          const retryCount = (notification.retry_count || 0) + 1;
          const retryAfter = now + (Math.pow(2, retryCount) * 3600); // Exponential backoff in hours
          
          await db.updateNotificationStatus(
            notification.id, 
            'failed', 
            error.message
          );
          
          processingResults.notifications.errors.push({
            notificationId: notification.id,
            error: error.message,
            retryCount
          });
        }
      }

      // 4. Cleanup expired tokens and old notifications
      console.log('Cleaning up expired tokens and old notifications...');
      
      // Clean up expired unsubscribe tokens (older than 7 days)
      const sevenDaysAgo = now - (7 * 24 * 60 * 60);
      const expiredTokensResult = await db.db.prepare(`
        DELETE FROM unsubscribe_tokens 
        WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < ?)
      `).bind(sevenDaysAgo, sevenDaysAgo).run();
      
      processingResults.cleanup.expiredTokens = expiredTokensResult.changes || 0;

      // Note: email_notification_history table was removed in migration 0013
      processingResults.cleanup.oldNotifications = 0;

      // Note: Email statistics tracking disabled - email_statistics table removed in migration 0013

    } catch (error) {
      console.error('Error during cron processing:', error);
      processingResults.notifications.errors.push({
        general: error.message
      });
    }

    processingResults.totalProcessingTime = Date.now() - startTime;

    console.log('Cron processing completed:', processingResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification processing completed',
        results: processingResults,
        processedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Critical error in cron processing:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Critical error during notification processing',
        message: error.message,
        processedAt: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};