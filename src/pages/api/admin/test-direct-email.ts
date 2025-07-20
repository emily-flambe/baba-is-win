import type { APIRoute } from 'astro'
import { EmailTemplateEngine } from '../../../lib/email/template-engine'
import { ResendEmailService } from '../../../lib/email/resend-service'

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
    
    console.log(`[Test Direct Email] Testing template rendering and email send to: ${email}`)
    
    // Create template engine and email service
    const templateEngine = new EmailTemplateEngine(locals.runtime.env)
    const emailService = new ResendEmailService(locals.runtime.env)
    
    // Create test variables for blog notification
    const testVariables = {
      title: 'Test Blog Post: Direct Template Test',
      description: 'This is a direct test of the email template system. All {{variables}} should be replaced with actual values.',
      url: `${locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev'}/blog/test-post`,
      unsubscribe_url: `${locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev'}/unsubscribe?token=test123`,
      publish_date: new Date().toLocaleDateString(),
      tags: ['test', 'email', 'template', 'debug'],
      site_name: locals.runtime.env.SITE_NAME || "Emily's Blog",
      site_url: locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev',
      user_name: email.split('@')[0], // Use email prefix as username
      content: 'This is the full content of the test blog post. It should appear in the text version of the email.'
    }
    
    try {
      // Render the template
      console.log('[Test Direct Email] Rendering template with variables:', testVariables)
      const emailContent = await templateEngine.renderTemplate('blog_notification', testVariables)
      
      console.log('[Test Direct Email] Template rendered successfully')
      console.log('[Test Direct Email] Subject:', emailContent.subject)
      console.log('[Test Direct Email] HTML length:', emailContent.html.length)
      console.log('[Test Direct Email] Text length:', emailContent.text.length)
      
      // Check for unreplaced variables
      const htmlUnreplaced = emailContent.html.match(/\{\{(\w+)\}\}/g) || []
      const textUnreplaced = emailContent.text.match(/\{\{(\w+)\}\}/g) || []
      const subjectUnreplaced = emailContent.subject.match(/\{\{(\w+)\}\}/g) || []
      
      console.log('[Test Direct Email] Unreplaced variables in HTML:', htmlUnreplaced)
      console.log('[Test Direct Email] Unreplaced variables in text:', textUnreplaced)
      console.log('[Test Direct Email] Unreplaced variables in subject:', subjectUnreplaced)
      
      // Send the email
      console.log('[Test Direct Email] Sending email via Resend')
      const result = await emailService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'List-Unsubscribe': `<${testVariables.unsubscribe_url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      })
      
      console.log('[Test Direct Email] Email sent successfully:', result)
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        emailId: result.id,
        template: {
          subject: emailContent.subject,
          htmlPreview: emailContent.html.substring(0, 500) + '...',
          textPreview: emailContent.text.substring(0, 500) + '...',
          htmlLength: emailContent.html.length,
          textLength: emailContent.text.length
        },
        unreplacedVariables: {
          html: htmlUnreplaced,
          text: textUnreplaced,
          subject: subjectUnreplaced
        },
        testVariables: testVariables
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('[Test Direct Email] Error:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to send test email', 
        details: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    console.error('[Test Direct Email] Unexpected error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}