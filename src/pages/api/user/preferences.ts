import type { APIRoute } from 'astro';
import { verifyJWT } from '../../../lib/auth/jwt';
import { AuthDB } from '../../../lib/auth/db';
import type { EmailPreferences } from '../../../lib/auth/types';

export const prerender = false;

// Helper function to extract user from JWT token
async function getUserFromToken(request: Request, env: any): Promise<any> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const token = cookieHeader
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];

  if (!token) {
    return null;
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return null;
  }

  const db = new AuthDB(env.DB);
  const user = await db.getUserById(payload.sub);
  
  return user;
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const user = await getUserFromToken(request, locals.runtime.env);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return user's current email preferences
    const preferences: EmailPreferences = {
      emailBlogUpdates: user.emailBlogUpdates,
      emailThoughtUpdates: user.emailThoughtUpdates,
      emailAnnouncements: user.emailAnnouncements,
      emailFrequency: 'immediate' // Default frequency
    };

    return new Response(
      JSON.stringify({ preferences }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Use locals.user if available (from middleware)
    const user = locals.user || await getUserFromToken(request, locals.runtime.env);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    // Handle direct preference properties (from account page)
    const validatedPreferences: EmailPreferences = {
      emailBlogUpdates: Boolean(body.emailBlogUpdates ?? body.preferences?.emailBlogUpdates),
      emailThoughtUpdates: Boolean(body.emailThoughtUpdates ?? body.preferences?.emailThoughtUpdates),
      emailAnnouncements: Boolean(body.emailAnnouncements ?? body.preferences?.emailAnnouncements),
      emailFrequency: body.emailFrequency || body.preferences?.emailFrequency || 'immediate'
    };

    // Validate email frequency
    const validFrequencies = ['immediate', 'daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(validatedPreferences.emailFrequency)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email frequency' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update user preferences in database
    const db = new AuthDB(locals.runtime.env.DB);
    await db.updateUserPreferences(user.id, validatedPreferences);

    return new Response(
      JSON.stringify({
        message: 'Preferences updated successfully',
        preferences: validatedPreferences
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update preferences' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  // Delegate to POST for backwards compatibility
  return POST({ request, locals });
};