import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { decision_maker_id, company_id, contact_name, contact_email, subject, body, message_type, tone } = await req.json();

    if (!contact_email) {
      return Response.json({ error: 'Contact email address required' }, { status: 400 });
    }

    // Get Gmail access token using app connector
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    } catch (error) {
      return Response.json({ 
        error: 'Gmail not connected. Please connect your Gmail account in Settings.',
        details: error.message 
      }, { status: 400 });
    }

    if (!accessToken) {
      return Response.json({ 
        error: 'Failed to get Gmail access token. Please reconnect your Gmail account.' 
      }, { status: 400 });
    }

    // Send email via Gmail API
    try {
      await sendViaGmail(accessToken, contact_email, subject, body);
    } catch (sendError) {
      return Response.json({ error: `Failed to send email: ${sendError.message}` }, { status: 500 });
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
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendViaGmail(accessToken, to, subject, body) {
  // Encode email in base64url format
  const emailContent = `To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`;
  const encodedEmail = btoa(emailContent)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorData}`);
  }

  const result = await response.json();
  return result;
}