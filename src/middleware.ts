import { defineMiddleware } from 'astro:middleware';
import { verifyJWT } from './lib/auth/jwt';
import { AuthDB } from './lib/auth/db';

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

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/api/admin', '/profile', '/api/auth/me', '/api/user/preferences', '/api/auth/google/status', '/api/auth/google/disconnect'];
  const isProtectedRoute = protectedRoutes.some(route => context.url.pathname.startsWith(route));

  if (isProtectedRoute) {
    const cookieHeader = context.request.headers.get('cookie');
    const token = cookieHeader
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

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
  const cookieHeader = context.request.headers.get('cookie');
  const token = cookieHeader
    ?.split('; ')
    .find(row => row.startsWith('session='))
    ?.split('=')[1];

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