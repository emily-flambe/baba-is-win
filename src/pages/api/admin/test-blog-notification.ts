import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { SimpleEmailNotificationService } from '../../../lib/email/simple-notification-service';
import type { BlogPost } from '../../../lib/email/template-engine';

export const POST: APIRoute = async ({ request, locals }) => {
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

    const { slug, testEmail } = await request.json();
    
    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing blog post slug' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Test Blog Notification] Testing notification for slug: ${slug}`);
    
    const db = new AuthDB(locals.runtime.env.DB);
    const notificationService = new SimpleEmailNotificationService(locals.runtime.env, db);
    
    // Get the blog post content
    const contentItem = await db.getContentItemBySlug(slug);
    if (!contentItem || contentItem.contentType !== 'blog') {
      return new Response(
        JSON.stringify({ error: 'Blog post not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a test blog post object
    const testBlogPost: BlogPost = {
      slug: contentItem.slug,
      title: contentItem.title,
      description: contentItem.excerpt || 'Test blog post description',
      publishDate: new Date(contentItem.publishedAt * 1000).toISOString(),
      tags: [],
      heroImage: undefined
    };
    
    console.log(`[Test Blog Notification] Blog post:`, testBlogPost);
    
    if (testEmail) {
      // Send to specific test email only
      console.log(`[Test Blog Notification] Sending test to: ${testEmail}`);
      
      // Create a temporary test user
      const testUser = {
        id: 'test-user',
        email: testEmail,
        username: 'Test User',
        email_blog_updates: true,
        email_verified: true
      };
      
      // Temporarily override the subscriber list
      const originalMethod = db.getSubscribersForContentType;
      db.getSubscribersForContentType = async () => [testUser];
      
      try {
        await notificationService.sendBlogNotification(testBlogPost);
      } finally {
        // Restore original method
        db.getSubscribersForContentType = originalMethod;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test blog notification sent to ${testEmail}`,
          blogPost: testBlogPost
        }, null, 2),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Send to all blog subscribers
      console.log(`[Test Blog Notification] Sending to all blog subscribers`);
      
      const subscribers = await db.getSubscribersForContentType('blog');
      console.log(`[Test Blog Notification] Found ${subscribers.length} blog subscribers`);
      
      await notificationService.sendBlogNotification(testBlogPost);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Blog notification sent to ${subscribers.length} subscribers`,
          blogPost: testBlogPost,
          subscriberCount: subscribers.length
        }, null, 2),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('[Test Blog Notification] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, null, 2),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};