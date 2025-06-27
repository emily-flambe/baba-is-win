import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';
import { hashPassword } from '../../../lib/auth/password';
import { createJWT } from '../../../lib/auth/jwt';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, username, password, emailBlogUpdates, emailThoughtUpdates, emailAnnouncements } = await request.json();

    // Validate input
    if (!email || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Email, username, and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);

    // Check if user already exists
    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: 'Email already in use' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingUsername = await db.getUserByUsername(username);
    if (existingUsername) {
      return new Response(
        JSON.stringify({ error: 'Username already taken' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await db.createUser(
      email, 
      username, 
      passwordHash,
      Boolean(emailBlogUpdates),
      Boolean(emailThoughtUpdates),
      Boolean(emailAnnouncements)
    );

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
    return new Response(
      JSON.stringify({ error: 'Failed to create account' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};