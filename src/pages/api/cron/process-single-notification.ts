import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { SimpleEmailNotificationService } from '../../../lib/email/simple-notification-service';
import { ContentProcessor } from '../../../lib/email/content-processor';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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
    const notificationService = new SimpleEmailNotificationService(locals.runtime.env, db);
    const contentProcessor = new ContentProcessor(locals.runtime.env, db, notificationService);

    // Process just ONE piece of unnotified content
    const unnotifiedContent = await db.getUnnotifiedContent();
    
    if (unnotifiedContent.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unnotified content to process' 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Take only the first item
    const contentItem = unnotifiedContent[0];
    console.log(`Processing single content item: ${contentItem.slug}`);

    let result = { success: false, successCount: 0, failedCount: 0 };

    if (contentItem.contentType === 'blog') {
      const blogPost = await contentProcessor['loadBlogPost'](contentItem.slug);
      if (blogPost) {
        // Ensure we use the title and description from the database, not from file loading
        blogPost.title = contentItem.title;
        blogPost.description = contentItem.description || blogPost.description;
        result = await notificationService.sendBlogNotification(blogPost);
        if (result.success && result.failedCount === 0) {
          await db.markContentNotified(contentItem.id);
        }
      }
    } else if (contentItem.contentType === 'thought') {
      const thought = await contentProcessor['loadThought'](contentItem.slug);
      if (thought) {
        // Ensure we use the title and description from the database, not from file loading
        thought.title = contentItem.title;
        thought.description = contentItem.description || thought.description;
        result = await notificationService.sendThoughtNotification(thought);
        if (result.success && result.failedCount === 0) {
          await db.markContentNotified(contentItem.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed notifications for ${contentItem.slug}`,
        content: {
          slug: contentItem.slug,
          type: contentItem.contentType,
          title: contentItem.title
        },
        result,
        remainingContent: unnotifiedContent.length - 1
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-single-notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};