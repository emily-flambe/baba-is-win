import type { APIRoute } from 'astro';
import { verifyJWT } from '../../../lib/auth/jwt';
import { AuthDB } from '../../../lib/auth/db';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = cookieHeader
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1];

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await verifyJWT(token, locals.runtime.env.JWT_SECRET);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);
    const user = await db.getUserById(payload.sub);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to authenticate' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};