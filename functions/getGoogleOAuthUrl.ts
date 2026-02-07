import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Get secrets from environment
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://flowzyn.base44.app';
    
    if (!clientId) {
      return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${baseUrl}/oauth/gmail/callback`;
    const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: user_id.toString()
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return Response.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});