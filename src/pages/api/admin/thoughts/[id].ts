import type { APIRoute } from 'astro';
import {
  getThoughtById,
  updateThought,
  deleteThought,
  type UpdateThoughtInput,
} from '../../../../lib/db/content';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Thought ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const thought = await getThoughtById(db, id);

    if (!thought) {
      return new Response(JSON.stringify({ error: 'Thought not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ thought }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching thought:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch thought' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Thought ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const body = await request.json();

    // Check if thought exists
    const existingThought = await getThoughtById(db, id);
    if (!existingThought) {
      return new Response(JSON.stringify({ error: 'Thought not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build update input
    const updates: UpdateThoughtInput = {};

    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.color !== undefined) updates.color = body.color;
    if (body.images !== undefined) updates.images = body.images;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status !== undefined) updates.status = body.status;
    if (body.publish_date !== undefined) updates.publishDate = body.publish_date;
    if (body.publish_time !== undefined) updates.publishTime = body.publish_time;

    const thought = await updateThought(db, id, updates);

    if (!thought) {
      return new Response(JSON.stringify({ error: 'Failed to update thought' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ thought }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating thought:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update thought' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Thought ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;

    // Check if thought exists first
    const existingThought = await getThoughtById(db, id);
    if (!existingThought) {
      return new Response(JSON.stringify({ error: 'Thought not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = await deleteThought(db, id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Failed to delete thought' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting thought:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete thought' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
