import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email_provider || !user.email_connected) {
      return Response.json({ error: 'No email account connected' }, { status: 400 });
    }

    const body = await req.json();
    const { contact_ids, company_id, company_name, messages } = body;

    if (!contact_ids || contact_ids.length === 0) {
      return Response.json({ error: 'No contacts selected' }, { status: 400 });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const contactId of contact_ids) {
      try {
        const contact = await base44.entities.Contact.get(contactId);
        if (!contact.email) {
          results.failed++;
          results.errors.push(`${contact.full_name}: No email address`);
          continue;
        }

        const message = messages[contactId];
        if (!message?.email_subject || !message?.email_body) {
          results.failed++;
          results.errors.push(`${contact.full_name}: No message generated`);
          continue;
        }

        // Send email
        await base44.functions.invoke('sendOutreachEmail', {
          recipient_email: contact.email,
          subject: message.email_subject,
          body: message.email_body,
          contact_id: contactId,
          contact_name: contact.full_name,
          contact_title: contact.title,
          company_id,
          company_name
        });

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Contact ${contactId}: ${error.message}`);
      }
    }

    return Response.json({
      success: results.sent > 0,
      results
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});