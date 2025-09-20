import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { verifyPassword, hashPassword } from '../../../lib/auth/password';
import { OAuthRateLimiter } from '../../../lib/oauth/rate-limiter';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Rate limiting
    const rateLimiter = new OAuthRateLimiter(locals.runtime.env);
    const rateLimitResult = await rateLimiter.checkRateLimit(request);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitResult.reason || 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter)
          }
        }
      );
    }
    // Check authentication
    const user = locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Users with Google OAuth can't change password
    if (user.google_id) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth users cannot change password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Current and new passwords are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Server-side password validation
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Additional password strength checks
    if (newPassword === currentPassword) {
      return new Response(
        JSON.stringify({ error: 'New password must be different from current password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^password/i,
      /^12345678/,
      /^qwerty/i,
      /^admin/i,
      /^letmein/i
    ];

    if (weakPatterns.some(pattern => pattern.test(newPassword))) {
      return new Response(
        JSON.stringify({ error: 'Password is too weak. Please choose a stronger password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);

    // Verify current password
    const passwordHash = await db.getPasswordHash(user.id);
    if (!passwordHash) {
      return new Response(
        JSON.stringify({ error: 'User has no password set' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validPassword = await verifyPassword(passwordHash, currentPassword);
    if (!validPassword) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);
    await db.updatePasswordHash(user.id, newPasswordHash);

    // Mark rate limit attempt as successful
    rateLimiter.markSuccess(request);

    return new Response(
      JSON.stringify({ success: true, message: 'Password changed successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Password change error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to change password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};