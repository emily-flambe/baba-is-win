import type { APIRoute } from 'astro';
import { AuthService } from '../../../lib/auth/auth-service';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const authService = new AuthService(locals.runtime.env.JWT_SECRET);
  
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': authService.createClearCookie()
    }
  });
};