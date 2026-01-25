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
    return new Response('Image storage not configured', { status: 500 });
  }

  const key = `uploads/${path}`;
  const object = await bucket.get(key);

  if (!object) {
    return new Response('Image not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
};
