import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = locals.user;
  const hasGoogleAccount = !!user.googleId;

  return new Response(JSON.stringify({
    connected: hasGoogleAccount,
    provider: hasGoogleAccount ? 'google' : undefined,
    providerEmail: user.providerEmail,
    displayName: user.displayName,
    profilePictureUrl: user.profilePictureUrl
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};