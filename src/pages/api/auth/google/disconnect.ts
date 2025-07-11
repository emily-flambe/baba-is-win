import type { APIRoute } from 'astro';
import { verifyPassword } from '../../../../lib/auth/password';
import { UserManager } from '../../../../lib/auth/user-manager';
import { OAuthRateLimiter } from '../../../../lib/oauth/rate-limiter';

const rateLimiter = new OAuthRateLimiter();

export const POST: APIRoute = async ({ request, locals }) => {
  try {
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

    // Rate limiting
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
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + rateLimit.retryAfter).toString()
        }
      });
    }

    const user = locals.user;

    // Check if user has a Google account linked
    if (!user.googleId) {
      return new Response(JSON.stringify({
        error: 'not_connected',
        message: 'No Google account is linked to this user'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        message: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { confirmPassword } = body;

    // Validate password confirmation
    if (!confirmPassword) {
      return new Response(JSON.stringify({
        error: 'missing_password',
        message: 'Password confirmation is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize database connection to get full user details
    const env = locals.runtime?.env;
    if (!env?.DB) {
      return new Response(JSON.stringify({
        error: 'database_error',
        message: 'Database connection not available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get full user details including password_hash
    const userManager = new UserManager(env.DB);
    const fullUser = await userManager.findUserById(user.id);
    
    if (!fullUser) {
      return new Response(JSON.stringify({
        error: 'user_not_found',
        message: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has a password (OAuth-only users cannot disconnect)
    if (!fullUser.password_hash || fullUser.password_hash === '') {
      return new Response(JSON.stringify({
        error: 'cannot_disconnect',
        message: 'Cannot disconnect the only authentication method. Please set a password first.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(fullUser.password_hash, confirmPassword);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({
        error: 'invalid_password',
        message: 'Invalid password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Disconnect Google account
    await userManager.disconnectGoogleAccount(user.id);

    // Mark rate limit as successful
    rateLimiter.markSuccess(request);

    return new Response(JSON.stringify({
      success: true,
      message: 'Google account disconnected successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google disconnect error:', error);
    
    return new Response(JSON.stringify({
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};