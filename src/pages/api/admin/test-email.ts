import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { EmailNotificationService } from '../../../lib/email/notification-service';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { type = 'blog', title = 'Test Email', force = false } = await request.json().catch(() => ({}));
    
    const env = locals.runtime.env;
    const authDB = new AuthDB(env.DB);
    const notificationService = new EmailNotificationService(env, authDB);

    // Create a test blog post or thought
    const testContent = {
      slug: 'test-email-' + Date.now(),
      title: title,
      description: 'This is a test email to verify the notification system is working correctly.',
      content: 'This is a test email sent manually from the admin panel to verify that the email notification system is functioning properly. If you received this, everything is working! 🎉',
      publishDate: new Date(),
      tags: ['test', 'email'],
      filePath: 'test'
    };

    let result;
    if (type === 'thought') {
      await notificationService.sendThoughtNotification(testContent);
      result = { message: 'Thought notification sent' };
    } else {
      await notificationService.sendBlogNotification(testContent);
      result = { message: 'Blog notification sent' };
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Test ${type} email sent successfully`,
      details: result,
      testContent: {
        title: testContent.title,
        type: type,
        recipients: 'Check logs for details'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Test email error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to send test email',
      details: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};