import type { APIRoute } from 'astro';

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

    const { resetContent, resetNotifications } = await request.json();
    
    console.log('[Reset Notifications] Starting reset process...');
    
    const results = {
      contentReset: 0,
      notificationsDeleted: 0,
      errors: []
    };
    
    // Reset content notification status
    if (resetContent) {
      try {
        const contentResetResult = await locals.runtime.env.DB.prepare(`
          UPDATE content_items 
          SET notification_sent = 0, notification_count = 0
          WHERE notification_sent = 1
        `).run();
        
        results.contentReset = contentResetResult.changes || 0;
        console.log(`[Reset Notifications] Reset ${results.contentReset} content items`);
      } catch (error) {
        console.error('[Reset Notifications] Error resetting content:', error);
        results.errors.push(`Content reset error: ${error}`);
      }
    }
    
    // Delete "sent" notifications that were never actually sent
    if (resetNotifications) {
      try {
        // First, get count of notifications to delete
        const countResult = await locals.runtime.env.DB.prepare(`
          SELECT COUNT(*) as count FROM email_notifications 
          WHERE status = 'sent' AND email_message_id IS NULL
        `).first();
        
        console.log(`[Reset Notifications] Found ${countResult?.count || 0} fake "sent" notifications`);
        
        // Delete them
        const deleteResult = await locals.runtime.env.DB.prepare(`
          DELETE FROM email_notifications 
          WHERE status = 'sent' AND email_message_id IS NULL
        `).run();
        
        results.notificationsDeleted = deleteResult.changes || 0;
        console.log(`[Reset Notifications] Deleted ${results.notificationsDeleted} notifications`);
      } catch (error) {
        console.error('[Reset Notifications] Error deleting notifications:', error);
        results.errors.push(`Notification deletion error: ${error}`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        results,
        message: `Reset ${results.contentReset} content items and deleted ${results.notificationsDeleted} notifications`
      }, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Reset Notifications] Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};