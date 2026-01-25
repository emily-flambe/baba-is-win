import { defineMiddleware } from 'astro:middleware';
import { verifyJWT } from './lib/auth/jwt';
import { AuthDB } from './lib/auth/db';

/**
 * Extract auth token from request.
 * Checks Authorization header first (for mobile app), then falls back to cookie (for web).
 */
function extractToken(request: Request): string | undefined {
  // Check Authorization header first (mobile app sends Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7); // Remove 'Bearer ' prefix
  }

  // Fall back to cookie (web browser)
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader
    ?.split('; ')
    .find(row => row.startsWith('session='))
    ?.split('=')[1];
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip auth check for public routes and API endpoints
  const publicRoutes = ['/login', '/signup', '/api/auth/login', '/api/auth/signup', '/api/user/unsubscribe'];
  const isPublicRoute = publicRoutes.some(route => context.url.pathname.startsWith(route));
  
  // Skip auth for static assets and non-HTML requests
  const isStaticAsset = context.url.pathname.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/);
  
  // Skip auth for cron endpoints - they use their own secret-based auth
  const isCronRoute = context.url.pathname.startsWith('/api/cron/');
  
  if (isPublicRoute || isStaticAsset || isCronRoute) {
    return next();
  }

  // Routes that require admin privileges
  const adminRoutes = ['/admin', '/api/admin'];
  const isAdminRoute = adminRoutes.some(route => context.url.pathname.startsWith(route));

  // Protected routes that require authentication (but not admin)
  const protectedRoutes = ['/profile', '/api/auth/me', '/api/user/preferences', '/api/auth/google/status', '/api/auth/google/disconnect'];
  const isProtectedRoute = protectedRoutes.some(route => context.url.pathname.startsWith(route));

  if (isAdminRoute || isProtectedRoute) {
    const token = extractToken(context.request);

    if (!token) {
      if (context.url.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return context.redirect(`/login?redirect=${encodeURIComponent(context.url.pathname)}`);
    }

    try {
      const payload = await verifyJWT(token, context.locals.runtime.env.JWT_SECRET);
      if (!payload) {
        throw new Error('Invalid token');
      }

      const db = new AuthDB(context.locals.runtime.env.DB);
      const user = await db.getUserById(payload.sub);

      if (!user) {
        throw new Error('User not found');
      }

      // Check admin privileges for admin routes
      if (isAdminRoute && !user.isAdmin) {
        if (context.url.pathname.startsWith('/api/')) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Forbidden: Admin access required', { status: 403 });
      }

      // Add user to context
      context.locals.user = user;
    } catch (error) {
      if (context.url.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return context.redirect(`/login?redirect=${encodeURIComponent(context.url.pathname)}`);
    }
  }

  // For all other routes, try to get user if token exists but don't require it
  const token = extractToken(context.request);

  if (token) {
    try {
      const payload = await verifyJWT(token, context.locals.runtime.env.JWT_SECRET);
      if (payload) {
        const db = new AuthDB(context.locals.runtime.env.DB);
        const user = await db.getUserById(payload.sub);
        if (user) {
          context.locals.user = user;
        }
      }
    } catch {
      // Ignore errors for optional auth
    }
  }

  return next();
});