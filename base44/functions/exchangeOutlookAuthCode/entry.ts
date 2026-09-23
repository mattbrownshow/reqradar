import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { auth_code, user_id } = await req.json();

    if (!auth_code || !user_id) {
      return Response.json({ error: 'auth_code and user_id are required' }, { status: 400 });
    }

    const clientId = Deno.env.get('MICROSOFT_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_OAUTH_CLIENT_SECRET');
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://flowzyn.base44.app';
    
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Microsoft OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${baseUrl}/oauth/outlook/callback`;

    // Step 1: Exchange auth code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: auth_code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return Response.json({ 
        success: false, 
        error: tokenData.error_description || tokenData.error 
      }, { status: 400 });
    }

    // Step 2: Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const userInfo = await userResponse.json();

    const email = userInfo.mail || userInfo.userPrincipalName;
    if (!email) {
      return Response.json({ 
        success: false, 
        error: 'Could not retrieve email from Microsoft' 
      }, { status: 400 });
    }

    // Step 3: Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Step 4: Update user record in Base44
    await base44.asServiceRole.entities.User.update(user_id, {
      email_provider: 'outlook',
      email_connected: true,
      email_address: email,
      outlook_access_token: tokenData.access_token,
      outlook_refresh_token: tokenData.refresh_token || null,
      outlook_token_expires: expiresAt.toISOString()
    });

    return Response.json({
      success: true,
      email: email,
      provider: 'outlook'
    });

  } catch (error) {
    console.error('Outlook OAuth exchange error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});