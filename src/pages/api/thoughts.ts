import type { APIRoute } from 'astro';
import { getThoughts } from '../../lib/db/content';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.DB;

    // Fetch all published thoughts (public endpoint)
    const thoughts = await getThoughts(db, {
      status: 'published',
      limit: 500,
    });

    return new Response(JSON.stringify({ thoughts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch thoughts' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
