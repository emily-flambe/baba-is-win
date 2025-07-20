import type { APIRoute } from 'astro'

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
    
    const { to } = await request.json()
    
    if (!to) {
      return new Response(JSON.stringify({ error: 'Email address required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const resendApiKey = locals.runtime.env.RESEND_API_KEY
    const fromEmail = locals.runtime.env.RESEND_FROM_EMAIL || 'Emily\'s Blog <noreply@emilycogsdill.com>'
    
    // Send a very simple test email
    const payload = {
      from: fromEmail,
      to: to,
      subject: 'Simple Test Email - Template Variables Test',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email with <strong>simple HTML</strong>.</p>
        <p>If you see this text below with curly braces, the templates are NOT being processed:</p>
        <p>Title: {{title}}</p>
        <p>Description: {{description}}</p>
        <p>If you see actual values below, the templates ARE being processed correctly:</p>
        <p>Site Name: ${locals.runtime.env.SITE_NAME || 'Emily\'s Blog'}</p>
        <p>Site URL: ${locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev'}</p>
      `,
      text: `Test Email

This is a test email with simple text.

If you see this text below with curly braces, the templates are NOT being processed:
Title: {{title}}
Description: {{description}}

If you see actual values below, the templates ARE being processed correctly:
Site Name: ${locals.runtime.env.SITE_NAME || 'Emily\'s Blog'}
Site URL: ${locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev'}`
    }
    
    console.log('Sending simple test email with payload:', JSON.stringify(payload, null, 2))
    
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      console.log('Resend API response:', result)
      
      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        result,
        payload,
        debug: {
          hasResendApiKey: !!resendApiKey,
          fromEmail,
          hasTemplateVariables: payload.html.includes('{{'),
          siteNameValue: locals.runtime.env.SITE_NAME || 'Emily\'s Blog',
          siteUrlValue: locals.runtime.env.SITE_URL || 'https://personal.emily-cogsdill.workers.dev'
        }
      }), {
        status: response.ok ? 200 : response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Error sending test email:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    console.error('Error in test-simple-email:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}