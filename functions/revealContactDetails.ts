import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_id, company_id } = await req.json();

    if (!contact_id) {
      return Response.json({ error: 'Missing contact_id' }, { status: 400 });
    }

    // Get existing contact
    const contact = await base44.entities.Contact.get(contact_id);

    if (!contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if already revealed
    if (contact.email && contact.phone) {
      return Response.json({ 
        status: 'already_revealed',
        message: 'Contact details already available'
      });
    }

    // Try Apollo first
    const apolloKey = Deno.env.get('APOLLO_API_KEY');
    if (apolloKey && contact.linkedin_url) {
      try {
        const apolloResponse = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apolloKey
          },
          body: JSON.stringify({
            linkedin_url: contact.linkedin_url
          })
        });

        if (apolloResponse.ok) {
          const apolloData = await apolloResponse.json();
          const person = apolloData.person;

          if (person) {
            const updateData = {
              email: person.email || contact.email,
              email_verified: !!person.email,
              email_source: person.email ? 'apollo' : contact.email_source,
              phone: person.phone_number || contact.phone,
              phone_source: person.phone_number ? 'apollo' : contact.phone_source,
              data_sources: [...new Set([...(contact.data_sources || []), 'apollo'])],
              apollo_data: person
            };

            await base44.entities.Contact.update(contact_id, updateData);

            return Response.json({
              status: 'success',
              source: 'apollo',
              credits_used: 1,
              contact: { ...contact, ...updateData }
            });
          }
        }
      } catch (error) {
        console.error('Apollo error:', error);
      }
    }

    // Try Lusha if Apollo failed
    const lushaKey = Deno.env.get('LUSHA_API_KEY');
    if (lushaKey && contact.full_name) {
      try {
        const [firstName, ...lastNameParts] = contact.full_name.split(' ');
        const lastName = lastNameParts.join(' ');

        const lushaResponse = await fetch('https://api.lusha.com/person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': lushaKey
          },
          body: JSON.stringify({
            firstName,
            lastName,
            company: contact.company_name
          })
        });

        if (lushaResponse.ok) {
          const lushaData = await lushaResponse.json();

          if (lushaData.emailAddress || lushaData.phoneNumbers?.[0]) {
            const updateData = {
              email: lushaData.emailAddress || contact.email,
              email_verified: !!lushaData.emailAddress,
              email_source: lushaData.emailAddress ? 'lusha' : contact.email_source,
              phone: lushaData.phoneNumbers?.[0]?.number || contact.phone,
              phone_source: lushaData.phoneNumbers?.[0]?.number ? 'lusha' : contact.phone_source,
              data_sources: [...new Set([...(contact.data_sources || []), 'lusha'])],
              lusha_data: lushaData
            };

            await base44.entities.Contact.update(contact_id, updateData);

            return Response.json({
              status: 'success',
              source: 'lusha',
              credits_used: 1,
              contact: { ...contact, ...updateData }
            });
          }
        }
      } catch (error) {
        console.error('Lusha error:', error);
      }
    }

    return Response.json({
      error: 'Unable to reveal contact details. Please try again later.',
      status: 'failed'
    }, { status: 500 });

  } catch (error) {
    console.error('Reveal contact error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});