import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, company_id, company_name, company_domain } = await req.json();

    if (!job_id || !company_id) {
      return Response.json({ error: 'Missing job_id or company_id' }, { status: 400 });
    }

    // Check for existing contacts
    const existingContacts = await base44.entities.Contact.filter({ company_id });
    if (existingContacts.length > 0) {
      return Response.json({
        status: 'existing',
        contacts_count: existingContacts.length,
        message: 'Contacts already enriched for this company'
      });
    }

    // Use Apollo API to find contacts
    const apolloKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloKey) {
      return Response.json({ error: 'Apollo API key not configured' }, { status: 500 });
    }

    const domain = company_domain || company_name.toLowerCase().replace(/\s+/g, '');

    const apolloResponse = await fetch('https://api.apollo.io/v1/contacts/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloKey
      },
      body: JSON.stringify({
        domain: domain,
        limit: 5,
        person_titles: ['CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP', 'Director', 'Head of']
      })
    });

    const apolloData = await apolloResponse.json();
    const contacts = apolloData.contacts || [];

    // Create Contact records
    const createdContacts = [];
    for (const contact of contacts) {
      const contactRecord = {
        company_id,
        company_name,
        company_domain: domain,
        full_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        title: contact.title || '',
        email: contact.email || '',
        email_verified: !!contact.email,
        email_source: 'apollo',
        phone: contact.phone_number || '',
        linkedin_url: contact.linkedin_url || '',
        data_sources: ['apollo'],
        data_quality_score: contact.confidence_score ? contact.confidence_score * 100 : 0,
        apollo_data: contact
      };

      if (contactRecord.full_name && contactRecord.email) {
        const created = await base44.entities.Contact.create(contactRecord);
        createdContacts.push(created);
      }
    }

    return Response.json({
      status: 'success',
      contacts_created: createdContacts.length,
      contacts: createdContacts,
      enriched_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});