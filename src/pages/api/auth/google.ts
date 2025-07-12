import type { APIRoute } from 'astro';
import { getGoogleOAuthConfig, generateAuthUrl } from '../../../lib/oauth/config';
import { OAuthStateManager } from '../../../lib/oauth/state';
import { OAuthRateLimiter } from '../../../lib/oauth/rate-limiter';
import { OAuthRequestValidator } from '../../../lib/oauth/validation';
import { OAuthSecurityMonitor } from '../../../lib/oauth/security-monitor';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const rateLimiter = new OAuthRateLimiter(env);
    
    // Rate limiting check
    const rateLimit = await rateLimiter.checkRateLimit(request);
    if (!rateLimit.allowed) {
      await OAuthSecurityMonitor.logSecurityEvent('rate_limit_exceeded', 'medium', {
        reason: rateLimit.reason,
        retryAfter: rateLimit.retryAfter
      }, request);

      return new Response(JSON.stringify({ 
        error: 'rate_limit_exceeded', 
        message: 'Too many OAuth requests. Please try again later.',
        retryAfter: rateLimit.retryAfter
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + rateLimit.retryAfter).toString()
        }
      });
    }

    // Input validation
    const validation = OAuthRequestValidator.validateInitiationRequest(request);
    if (!validation.valid) {
      await OAuthSecurityMonitor.logSecurityEvent('invalid_request', 'medium', {
        errors: validation.errors
      }, request);

      return new Response(JSON.stringify({ 
        error: 'invalid_request', 
        message: 'Invalid request parameters',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl') || '/';
    const linkAccount = url.searchParams.get('linkAccount') === 'true';

    const config = getGoogleOAuthConfig(locals.runtime.env);
    const stateManager = new OAuthStateManager(locals.runtime.env.JWT_SECRET);

    const stateData = {
      returnUrl,
      linkAccount,
      userId: locals.user?.id
    };

    const state = await stateManager.createState(stateData);
    const authUrl = generateAuthUrl(config, state);

    // Mark rate limiter success
    rateLimiter.markSuccess(request);

    // Log successful OAuth initiation
    await OAuthSecurityMonitor.logSecurityEvent('oauth_initiation', 'low', {
      linkAccount,
      returnUrl,
      userId: locals.user?.id
    }, request);

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    
    await OAuthSecurityMonitor.logSecurityEvent('oauth_initiation_error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, request);

    return new Response(JSON.stringify({ error: 'OAuth configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};