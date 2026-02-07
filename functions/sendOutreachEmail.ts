import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      recipient_email,
      subject,
      body: emailBody,
      contact_id,
      company_id
    } = body;

    if (!user.email_provider || !user.email_connected) {
      return Response.json(
        { error: 'No email account connected' },
        { status: 400 }
      );
    }

    let accessToken;
    let refreshToken;
    let tokenExpires;
    let provider = user.email_provider;

    if (provider === 'gmail') {
      accessToken = user.gmail_access_token;
      refreshToken = user.gmail_refresh_token;
      tokenExpires = user.gmail_token_expires;
    } else if (provider === 'outlook') {
      accessToken = user.outlook_access_token;
      refreshToken = user.outlook_refresh_token;
      tokenExpires = user.outlook_token_expires;
    } else {
      return Response.json({ error: 'Unknown email provider' }, { status: 400 });
    }

    if (!accessToken) {
      return Response.json({ error: 'Email token not found' }, { status: 400 });
    }

    // Check if token expired and refresh if needed
    if (tokenExpires && new Date(tokenExpires) < new Date()) {
      if (!refreshToken) {
        return Response.json({ error: 'Token expired and cannot refresh' }, { status: 401 });
      }

      accessToken = await refreshAccessToken(provider, refreshToken);
      if (!accessToken) {
        return Response.json({ error: 'Failed to refresh token' }, { status: 401 });
      }

      // Update user with new token
      const expiresIn = 3600;
      const newExpires = new Date(Date.now() + expiresIn * 1000).toISOString();
      
      const updateData = {};
      if (provider === 'gmail') {
        updateData.gmail_access_token = accessToken;
        updateData.gmail_token_expires = newExpires;
      } else {
        updateData.outlook_access_token = accessToken;
        updateData.outlook_token_expires = newExpires;
      }
      
      await base44.auth.updateMe(updateData);
    }

    // Send email via provider
    if (provider === 'gmail') {
      await sendViaGmail(accessToken, user.email_address, recipient_email, subject, emailBody);
    } else {
      await sendViaOutlook(accessToken, recipient_email, subject, emailBody);
    }

    // Log outreach message
    if (contact_id && company_id) {
      await base44.entities.OutreachMessage.create({
        contact_id,
        contact_name: body.contact_name,
        contact_title: body.contact_title,
        company_id,
        company_name: body.company_name,
        subject,
        body: emailBody,
        channel: 'email',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendViaGmail(accessToken, fromEmail, toEmail, subject, body) {
  const message = `From: ${fromEmail}\nTo: ${toEmail}\nSubject: ${subject}\nContent-Type: text/plain; charset="UTF-8"\n\n${body}`;
  const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail send failed: ${error.error.message}`);
  }

  return response.json();
}

async function sendViaOutlook(accessToken, toEmail, subject, body) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'text',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: toEmail
            }
          }
        ]
      },
      saveToSentItems: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Outlook send failed: ${error.error.message}`);
  }

  return response.json();
}

async function refreshAccessToken(provider, refreshToken) {
  if (provider === 'gmail') {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    const data = await response.json();
    return data.access_token || null;
  } else if (provider === 'outlook') {
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Mail.Send offline_access'
      }).toString()
    });

    const data = await response.json();
    return data.access_token || null;
  }

  return null;
}