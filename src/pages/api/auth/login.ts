import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { verifyPassword } from '../../../lib/auth/password';
import { createJWT } from '../../../lib/auth/jwt';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { emailOrUsername, password } = await request.json();

    // Validate input
    if (!emailOrUsername || !password) {
      return new Response(
        JSON.stringify({ error: 'Email/username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);

    // Find user by email or username
    let user = await db.getUserByEmail(emailOrUsername);
    if (!user) {
      user = await db.getUserByUsername(emailOrUsername);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const passwordHash = await db.getPasswordHash(user.id);
    if (!passwordHash) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validPassword = await verifyPassword(passwordHash, password);
    if (!validPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create JWT
    const token = await createJWT(
      {
        sub: user.id,
        email: user.email,
        username: user.username
      },
      locals.runtime.env.JWT_SECRET
    );

    return new Response(
      JSON.stringify({ 
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        token 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': `auth-token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        } 
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to login' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};