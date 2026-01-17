import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const path = params.path;

  if (!path) {
    return new Response('Not found', { status: 404 });
  }

  const bucket = locals.runtime.env.IMAGES;
  if (!bucket) {
    console.error('R2 IMAGES binding not configured');
    return new Response('Storage not configured', { status: 500 });
  }

  try {
    const object = await bucket.get(path);

    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error serving asset:', error);
    return new Response('Error serving asset', { status: 500 });
  }
};
