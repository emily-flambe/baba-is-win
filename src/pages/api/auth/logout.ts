import type { APIRoute } from 'astro';
import { AuthService } from '../../../lib/auth/auth-service';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const authService = new AuthService(locals.runtime.env.JWT_SECRET);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': authService.createClearCookie()
    }
  });
};

export const GET: APIRoute = async ({ locals }) => {
  const authService = new AuthService(locals.runtime.env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': authService.createClearCookie()
    }
  });
};