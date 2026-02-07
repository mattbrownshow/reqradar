import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { decision_maker_id, company_id, contact_name, contact_email, subject, body, message_type, tone } = await req.json();

    // Check if user has email connected
    if (!user.email_connected || !user.email_provider) {
      return Response.json({ error: 'Email not connected' }, { status: 400 });
    }

    if (!contact_email) {
      return Response.json({ error: 'Contact email address required' }, { status: 400 });
    }

    // Call the appropriate email service based on provider
    let result;
    if (user.email_provider === 'gmail') {
      result = await sendViaGmail(user, contact_email, subject, body);
    } else if (user.email_provider === 'outlook') {
      result = await sendViaOutlook(user, contact_email, subject, body);
    } else {
      return Response.json({ error: 'Unsupported email provider' }, { status: 400 });
    }

    // Store the sent email record
    try {
      await base44.asServiceRole.entities.OutreachMessage.create({
        contact_id: decision_maker_id,
        contact_name: contact_name,
        company_id: company_id,
        subject: subject,
        body: body,
        channel: 'email',
        status: 'sent',
        sent_at: new Date().toISOString(),
        template_type: message_type
      });
    } catch (storageError) {
      console.error('Failed to store email record:', storageError);
      // Don't fail the request if storage fails, email was already sent
    }

    return Response.json({
      success: true,
      message: 'Email sent successfully',
      provider_message_id: result.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendViaGmail(user, to, subject, body) {
  const accessToken = user.gmail_access_token;
  if (!accessToken) {
    throw new Error('Gmail access token not found');
  }

  // Refresh token if needed
  let token = accessToken;
  if (user.gmail_token_expires && new Date(user.gmail_token_expires) < new Date()) {
    const refreshed = await refreshGmailToken(user.gmail_refresh_token);
    token = refreshed.access_token;
  }

  const emailContent = `To: ${to}\nSubject: ${subject}\n\n${body}`;
  const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.statusText}`);
  }

  const result = await response.json();
  return { messageId: result.id };
}

async function sendViaOutlook(user, to, subject, body) {
  const accessToken = user.outlook_access_token;
  if (!accessToken) {
    throw new Error('Outlook access token not found');
  }

  // Refresh token if needed
  let token = accessToken;
  if (user.outlook_token_expires && new Date(user.outlook_token_expires) < new Date()) {
    const refreshed = await refreshOutlookToken(user.outlook_refresh_token);
    token = refreshed.access_token;
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject: subject,
        body: {
          contentType: 'Text',
          content: body
        },
        toRecipients: [
          { emailAddress: { address: to } }
        ]
      },
      saveToSentItems: 'true'
    })
  });

  if (!response.ok) {
    throw new Error(`Outlook API error: ${response.statusText}`);
  }

  return { messageId: 'sent' };
}

async function refreshGmailToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail token');
  }

  return response.json();
}

async function refreshOutlookToken(refreshToken) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Mail.Send Mail.Read offline_access'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Outlook token');
  }

  return response.json();
}