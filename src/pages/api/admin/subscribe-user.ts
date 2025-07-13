import type { APIRoute } from 'astro';
import { AuthDB } from '../../../lib/auth/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, blogUpdates = true, thoughtUpdates = true, announcements = true } = await request.json().catch(() => ({}));
    
    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const env = locals.runtime.env;
    const authDB = new AuthDB(env.DB);

    // Find user by email
    const user = await authDB.getUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: `User with email ${email} not found`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update their preferences
    await authDB.updateUserPreferences(user.id, {
      emailBlogUpdates: blogUpdates,
      emailThoughtUpdates: thoughtUpdates,
      emailAnnouncements: announcements,
      emailFrequency: 'immediate'
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully subscribed ${email} to email notifications`,
      preferences: {
        blogUpdates,
        thoughtUpdates,
        announcements
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscribe user error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to subscribe user',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};