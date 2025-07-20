import type { APIRoute } from 'astro'
import { AuthDB } from '../../../lib/auth/db'
import { SimpleEmailNotificationService } from '../../../lib/email/simple-notification-service'
import type { BlogPost } from '../../../lib/email/template-engine'

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization')
    const cronSecret = locals.runtime.env.CRON_SECRET
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const token = authHeader.substring(7)
    if (!cronSecret || token !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const { email } = await request.json()
    
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email address required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`[Test Email Template] Sending test to: ${email}`)
    
    const db = new AuthDB(locals.runtime.env.DB)
    const notificationService = new SimpleEmailNotificationService(locals.runtime.env, db)
    
    // Create a test blog post with all required fields
    const testBlogPost: BlogPost = {
      slug: 'test-blog-post',
      title: 'Test Blog Post: Email Template Testing',
      description: 'This is a test blog post to verify that email templates are working correctly. If you receive this email with proper formatting and all variables replaced, the template system is working.',
      publishDate: new Date().toISOString(),
      tags: ['test', 'email', 'template'],
      heroImage: undefined
    }
    
    // Create a test user
    const testUser = {
      id: 'test-user-' + Date.now(),
      email: email,
      username: email.split('@')[0], // Use email prefix as username
      email_blog_updates: true,
      email_verified: true
    }
    
    // Temporarily override the subscriber list to only send to test user
    const originalMethod = db.getSubscribersForContentType
    db.getSubscribersForContentType = async () => [testUser]
    
    try {
      console.log('[Test Email Template] Sending notification with test data:', {
        post: testBlogPost,
        user: testUser
      })
      
      await notificationService.sendBlogNotification(testBlogPost)
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        testData: {
          to: email,
          postTitle: testBlogPost.title,
          postDescription: testBlogPost.description,
          publishDate: testBlogPost.publishDate,
          tags: testBlogPost.tags,
          username: testUser.username
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('[Test Email Template] Error:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to send test email', 
        details: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    } finally {
      // Restore original method
      db.getSubscribersForContentType = originalMethod
    }
  } catch (error) {
    console.error('[Test Email Template] Unexpected error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}