import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';

export const prerender = false;

export const DELETE: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new AuthDB(locals.runtime.env.DB);

    // Delete all user sessions first
    await db.db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(locals.user.id)
      .run();

    // Delete user's thoughts
    await db.db
      .prepare('DELETE FROM thoughts WHERE author_id = ?')
      .bind(locals.user.id)
      .run();

    // Delete user's blog posts
    await db.db
      .prepare('DELETE FROM blog_posts WHERE author_id = ?')
      .bind(locals.user.id)
      .run();

    // Finally, delete the user account
    await db.db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(locals.user.id)
      .run();

    // Clear the auth cookie
    const clearCookie = [
      'session=',
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'SameSite=Strict'
    ];

    if (import.meta.env.PROD) {
      clearCookie.push('Secure');
    }

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookie.join('; ')
        }
      }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete account' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};