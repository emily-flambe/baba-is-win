import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

function generateUniqueKey(extension: string): string {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  return `uploads/${timestamp}-${randomId}.${extension}`;
}

export const POST: APIRoute = async ({ locals, request }) => {
  // Auth check
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check R2 binding
  const bucket = locals.runtime.env.IMAGES;
  if (!bucket) {
    console.error('R2 IMAGES binding not configured');
    return new Response(
      JSON.stringify({ error: 'Image storage not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return new Response(
        JSON.stringify({
          error: `Invalid file type: ${file.type}. Allowed: jpeg, png, gif, webp`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique key and upload to R2
    const key = generateUniqueKey(extension);
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Return the key and URL
    // URL pattern: /assets/uploads/{key} - will be served through worker or R2 public access
    const url = `/assets/${key}`;

    return new Response(JSON.stringify({ url, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload image' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
