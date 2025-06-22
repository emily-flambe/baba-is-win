import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  
  return new Response(
    JSON.stringify({ 
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        username: user.username
      } : null
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    }
  );
};