import type { APIRoute } from 'astro';
import { OAuthRateLimiter } from '../../../../lib/oauth/rate-limiter';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const rateLimiter = new OAuthRateLimiter(locals.runtime?.env);
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ 
        error: 'unauthorized',
        message: 'Not authenticated' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting - more permissive for status endpoint
    const rateLimit = await rateLimiter.checkRateLimit(request);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'rate_limit_exceeded',
        message: rateLimit.reason || 'Too many requests. Please try again later.',
        retryAfter: rateLimit.retryAfter
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + rateLimit.retryAfter).toString(),
          'Retry-After': rateLimit.retryAfter.toString()
        }
      });
    }

    const user = locals.user;
    const hasGoogleAccount = !!user.googleId;

    // Mark rate limit as successful
    rateLimiter.markSuccess(request);

    return new Response(JSON.stringify({
      connected: hasGoogleAccount,
      provider: hasGoogleAccount ? 'google' : undefined,
      providerEmail: user.providerEmail,
      displayName: user.displayName,
      profilePictureUrl: user.profilePictureUrl
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });

  } catch (error) {
    console.error('OAuth status error:', error);
    
    return new Response(JSON.stringify({
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};