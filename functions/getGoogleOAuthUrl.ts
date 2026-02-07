import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return Response.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    const scope = 'https://www.googleapis.com/auth/gmail.send';
    const state = btoa(JSON.stringify({ user_id: user.id, timestamp: Date.now() }));

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    }).toString()}`;

    return Response.json({ url });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});