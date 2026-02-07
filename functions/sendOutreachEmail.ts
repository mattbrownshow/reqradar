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

    // Get user's email connection data
    const userData = await base44.auth.me();
    
    // Check if either Gmail or Outlook is connected
    if (!userData?.gmail_connected && !userData?.outlook_connected) {
      return Response.json({ error: 'No email account connected' }, { status: 400 });
    }

    // Call the appropriate email service
    let result;
    if (userData?.gmail_connected) {
      result = await sendViaGmail(base44, contact_email, subject, body);
    } else if (userData?.outlook_connected) {
      result = await sendViaOutlook(base44, contact_email, subject, body);
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
    }

    return Response.json({
      success: true,
      message: 'Email sent successfully',
      provider_message_id: result?.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendViaGmail(base44, to, subject, body) {
  try {
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    
    const emailContent = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

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
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const result = await response.json();
    return { messageId: result.id };
  } catch (error) {
    console.error('Gmail send error:', error);
    throw error;
  }
}

async function sendViaOutlook(base44, to, subject, body) {
  try {
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('outlook');
    
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
  } catch (error) {
    console.error('Outlook send error:', error);
    throw error;
  }
}