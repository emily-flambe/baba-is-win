import type { APIRoute } from 'astro';
import {
  getBlogPosts,
  createBlogPost,
  type ContentStatus,
  type CreateBlogPostInput,
} from '../../../../lib/db/content';

export const prerender = false;

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export const GET: APIRoute = async ({ locals, url }) => {
  // Auth is handled by middleware - locals.user is set if authenticated
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

    const posts = await getBlogPosts(db, {
      status: status || undefined,
      limit,
      offset,
    });

    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch blog posts' }),
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
    if (!body.slug || typeof body.slug !== 'string') {
      return new Response(JSON.stringify({ error: 'slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.title || typeof body.title !== 'string') {
      return new Response(JSON.stringify({ error: 'title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.content || typeof body.content !== 'string') {
      return new Response(JSON.stringify({ error: 'content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate reading time
    const readingTimeMinutes = calculateReadingTime(body.content);

    const input: CreateBlogPostInput = {
      slug: body.slug,
      title: body.title,
      description: body.description || null,
      content: body.content,
      thumbnail: body.thumbnail || null,
      tags: body.tags || [],
      premium: body.premium || false,
      status: body.status || 'draft',
      publishDate: body.publish_date || null,
      readingTimeMinutes,
    };

    const post = await createBlogPost(db, input);

    return new Response(JSON.stringify({ post }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create blog post' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
