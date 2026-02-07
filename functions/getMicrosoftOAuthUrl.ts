import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const redirectUri = Deno.env.get('MICROSOFT_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return Response.json(
        { error: 'Microsoft OAuth not configured' },
        { status: 500 }
      );
    }

    const scope = 'Mail.Send offline_access';
    const state = btoa(JSON.stringify({ user_id: user.id, timestamp: Date.now() }));

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: state,
      prompt: 'select_account'
    }).toString()}`;

    return Response.json({ url });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});