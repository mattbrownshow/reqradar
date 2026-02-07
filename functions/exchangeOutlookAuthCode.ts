import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return Response.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const redirectUri = Deno.env.get('MICROSOFT_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      return Response.json(
        { error: 'Microsoft OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'Mail.Send offline_access'
      }).toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return Response.json(
        { error: `Token exchange failed: ${error.error}` },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user email from Microsoft Graph
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    let emailAddress = user.email;
    if (graphResponse.ok) {
      const profile = await graphResponse.json();
      emailAddress = profile.userPrincipalName || profile.mail || user.email;
    }

    // Save tokens to user
    const expiresIn = tokens.expires_in || 3600;
    const tokenExpires = new Date(Date.now() + expiresIn * 1000).toISOString();

    await base44.auth.updateMe({
      email_provider: 'outlook',
      email_connected: true,
      email_address: emailAddress,
      outlook_access_token: tokens.access_token,
      outlook_refresh_token: tokens.refresh_token || null,
      outlook_token_expires: tokenExpires
    });

    return Response.json({
      success: true,
      email: emailAddress,
      provider: 'outlook'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});