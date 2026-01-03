import type { APIRoute } from 'astro';
import {
  getBlogPostById,
  updateBlogPost,
  deleteBlogPost,
  type UpdateBlogPostInput,
} from '../../../../lib/db/content';

export const prerender = false;

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Post ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const post = await getBlogPostById(db, id);

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch blog post' }),
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
    return new Response(JSON.stringify({ error: 'Post ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const body = await request.json();

    // Check if post exists
    const existingPost = await getBlogPostById(db, id);
    if (!existingPost) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build update input
    const updates: UpdateBlogPostInput = {};

    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.content !== undefined) {
      updates.content = body.content;
      // Recalculate reading time when content changes
      updates.readingTimeMinutes = calculateReadingTime(body.content);
    }
    if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.premium !== undefined) updates.premium = body.premium;
    if (body.status !== undefined) updates.status = body.status;
    if (body.publish_date !== undefined) updates.publishDate = body.publish_date;

    const post = await updateBlogPost(db, id, updates);

    if (!post) {
      return new Response(JSON.stringify({ error: 'Failed to update post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update blog post' }),
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
    return new Response(JSON.stringify({ error: 'Post ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;

    // Check if post exists first
    const existingPost = await getBlogPostById(db, id);
    if (!existingPost) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = await deleteBlogPost(db, id);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Failed to delete post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete blog post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
