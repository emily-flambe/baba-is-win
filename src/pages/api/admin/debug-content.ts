import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check authorization
    const cronSecret = request.headers.get('x-cron-secret');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (cronSecret !== locals.runtime.env.CRON_SECRET && token !== locals.runtime.env.CRON_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all content items
    const contentItems = await locals.runtime.env.DB.prepare(`
      SELECT id, slug, content_type, title, notification_sent, notification_count, 
             created_at, updated_at, publish_date
      FROM content_items 
      ORDER BY publish_date DESC
    `).all();
    
    // Get counts
    const notifiedCount = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM content_items WHERE notification_sent = 1
    `).first();
    
    const unnotifiedCount = await locals.runtime.env.DB.prepare(`
      SELECT COUNT(*) as count FROM content_items WHERE notification_sent = 0
    `).first();
    
    // Get content with different notification_sent values (for debugging)
    const contentByNotificationStatus = await locals.runtime.env.DB.prepare(`
      SELECT notification_sent, COUNT(*) as count 
      FROM content_items 
      GROUP BY notification_sent
    `).all();
    
    const response = {
      summary: {
        total: contentItems.results.length,
        notified: notifiedCount?.count || 0,
        unnotified: unnotifiedCount?.count || 0,
        byStatus: contentByNotificationStatus.results
      },
      items: contentItems.results.map(item => ({
        id: item.id,
        slug: item.slug,
        type: item.content_type,
        title: item.title,
        notification_sent: item.notification_sent,
        notification_sent_raw: item.notification_sent, // Show raw value
        notification_sent_bool: !!item.notification_sent, // Show as boolean
        notification_count: item.notification_count,
        publish_date: new Date(item.publish_date * 1000).toISOString(),
        created_at: new Date(item.created_at * 1000).toISOString(),
        updated_at: new Date(item.updated_at * 1000).toISOString()
      }))
    };
    
    return new Response(
      JSON.stringify(response, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Debug Content] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};