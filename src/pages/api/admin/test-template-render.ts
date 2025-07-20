import type { APIRoute } from 'astro';
import { EmailTemplateEngine } from '../../../lib/email/template-engine';
import type { TemplateVariables } from '../../../lib/email/template-engine';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== locals.runtime.env.CRON_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { templateName = 'blog_notification' } = await request.json().catch(() => ({}));
    
    const env = locals.runtime.env;
    const templateEngine = new EmailTemplateEngine(env);

    // Create test variables
    const testVariables: TemplateVariables = {
      title: 'Test Blog Post Title',
      description: 'This is a test description to verify template rendering.',
      url: 'https://example.com/blog/test-post',
      unsubscribe_url: 'https://example.com/unsubscribe?token=test123',
      publish_date: new Date().toLocaleDateString(),
      tags: ['test', 'template', 'debug'],
      site_name: env.SITE_NAME || 'Test Site',
      site_url: env.SITE_URL || 'https://example.com',
      user_name: 'Test User',
      content: 'This is test content for thought notifications.'
    };

    console.log('[Test Template Render] Starting template render test');
    console.log('[Test Template Render] Template name:', templateName);
    console.log('[Test Template Render] Variables:', JSON.stringify(testVariables, null, 2));

    // Render the template
    const result = await templateEngine.renderTemplate(templateName, testVariables);

    console.log('[Test Template Render] Render complete');
    console.log('[Test Template Render] Subject:', result.subject);
    console.log('[Test Template Render] HTML length:', result.html.length);
    console.log('[Test Template Render] Text length:', result.text.length);

    // Check if variables were replaced
    const unreplacedVars = [];
    const checkForUnreplaced = (content: string, varName: string) => {
      if (content.includes(`{{${varName}}}`)) {
        unreplacedVars.push(varName);
      }
    };

    // Check all the main variables
    ['title', 'user_name', 'site_name', 'url', 'unsubscribe_url'].forEach(varName => {
      checkForUnreplaced(result.subject, varName);
      checkForUnreplaced(result.html, varName);
      checkForUnreplaced(result.text, varName);
    });

    return new Response(JSON.stringify({
      success: true,
      templateName,
      result: {
        subject: result.subject,
        htmlPreview: result.html.substring(0, 500) + '...',
        textPreview: result.text.substring(0, 300) + '...',
        htmlLength: result.html.length,
        textLength: result.text.length
      },
      unreplacedVariables: unreplacedVars,
      testVariables,
      debug: {
        hasTemplateEngine: !!templateEngine,
        envSiteName: env.SITE_NAME,
        envSiteUrl: env.SITE_URL
      }
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[Test Template Render] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to render template',
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};