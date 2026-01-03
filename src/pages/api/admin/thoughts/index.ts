import type { APIRoute } from 'astro';
import {
  getThoughts,
  createThought,
  type ContentStatus,
  type CreateThoughtInput,
} from '../../../../lib/db/content';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;

    const status = url.searchParams.get('status') as ContentStatus | null;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const thoughts = await getThoughts(db, {
      status: status || undefined,
      limit,
      offset,
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

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const body = await request.json();

    // Validate required fields
    if (!body.content || typeof body.content !== 'string') {
      return new Response(JSON.stringify({ error: 'content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auto-generate slug if not provided
    const slug = body.slug || `thought-${Date.now()}`;

    const input: CreateThoughtInput = {
      slug,
      title: body.title || null,
      content: body.content,
      color: body.color || null,
      images: body.images || [],
      tags: body.tags || [],
      status: body.status || 'draft',
      publishDate: body.publish_date || null,
      publishTime: body.publish_time || null,
    };

    const thought = await createThought(db, input);

    return new Response(JSON.stringify({ thought }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating thought:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create thought' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
