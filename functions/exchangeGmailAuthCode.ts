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

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      return Response.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
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

    // Get user email from Gmail
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    let emailAddress = user.email;
    if (gmailResponse.ok) {
      const profile = await gmailResponse.json();
      emailAddress = profile.emailAddress;
    }

    // Save tokens to user
    const expiresIn = tokens.expires_in || 3600;
    const tokenExpires = new Date(Date.now() + expiresIn * 1000).toISOString();

    await base44.auth.updateMe({
      email_provider: 'gmail',
      email_connected: true,
      email_address: emailAddress,
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token || null,
      gmail_token_expires: tokenExpires
    });

    return Response.json({
      success: true,
      email: emailAddress,
      provider: 'gmail'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});