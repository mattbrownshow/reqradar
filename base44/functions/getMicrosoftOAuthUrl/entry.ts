import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const clientId = Deno.env.get('MICROSOFT_OAUTH_CLIENT_ID');
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://flowzyn.base44.app';
    
    if (!clientId) {
      return Response.json({ error: 'Microsoft OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${baseUrl}/oauth/outlook/callback`;
    const scopes = 'Mail.Send Mail.Read User.Read offline_access';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      response_mode: 'query',
      state: user_id.toString()
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return Response.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating Microsoft OAuth URL:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});