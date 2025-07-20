import type { APIRoute } from 'astro'
import { AuthDB } from '../../../lib/auth/db'
import { EmailNotificationService } from '../../../lib/email/notification-service'

export const GET: APIRoute = async ({ request, locals }) => {
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
    
    // Get email service status
    const db = new AuthDB(locals.runtime.env.DB)
    const emailService = new EmailNotificationService(locals.runtime.env, db)
    
    const status = await emailService.getSystemStatus()
    
    return new Response(JSON.stringify({
      success: true,
      status: status,
      circuitBreaker: {
        isOpen: status.circuit_breaker.is_open,
        status: status.circuit_breaker.is_open ? 'open' : 'closed',
        failureCount: status.circuit_breaker.failure_count,
        lastFailure: status.circuit_breaker.last_failure_time ? new Date(status.circuit_breaker.last_failure_time).toISOString() : null,
        willResetAt: status.circuit_breaker.is_open && status.circuit_breaker.last_failure_time
          ? new Date(status.circuit_breaker.last_failure_time + status.circuit_breaker.reset_timeout).toISOString()
          : null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[Email Status] Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

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
    
    const { action } = await request.json()
    
    if (action !== 'reset-circuit-breaker') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Note: The circuit breaker will reset on the next successful email send
    // or automatically after 5 minutes. For now, we'll return the current status.
    
    const db = new AuthDB(locals.runtime.env.DB)
    const emailService = new EmailNotificationService(locals.runtime.env, db)
    const status = await emailService.getSystemStatus()
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Circuit breaker will reset automatically after 5 minutes or on next successful email',
      currentStatus: status.circuit_breaker
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[Email Status Reset] Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}