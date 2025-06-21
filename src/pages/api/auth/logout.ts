import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'auth-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    }
  });
};