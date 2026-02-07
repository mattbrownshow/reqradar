import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    const { job_id, pipeline_id, company_id, company_name, company_domain } = payload;

    if (!job_id || !pipeline_id) {
      console.error('Invalid enrichment payload:', payload);
      return Response.json({ error: 'Missing job_id or pipeline_id' }, { status: 400 });
    }

    // Fetch the OpenRole to get company info
    const openRole = await base44.asServiceRole.entities.OpenRole.get(jobPipeline.job_id);
    if (!openRole || !openRole.company_id) {
      console.error('OpenRole not found:', jobPipeline.job_id);
      return Response.json({ error: 'OpenRole not found' }, { status: 404 });
    }

    const company_id = openRole.company_id;
    const company_name = openRole.company_name;
    const company_domain = openRole.company_domain || company_name.toLowerCase().replace(/\s+/g, '');

    // Check for existing contacts
    const existingContacts = await base44.asServiceRole.entities.Contact.filter({ company_id });
    if (existingContacts.length > 0) {
      console.log(`Contacts already exist for company ${company_id}`);
      if (jobPipeline.stage === 'saved') {
        await base44.asServiceRole.entities.JobPipeline.update(jobPipeline.id, { stage: 'intel_gathering' });
      }
      return Response.json({ status: 'existing', contacts_count: existingContacts.length });
    }

    // Use Apollo API to find contacts
    const apolloKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloKey) {
      console.error('Apollo API key not configured');
      return Response.json({ error: 'Apollo API key not configured' }, { status: 500 });
    }

    const apolloResponse = await fetch('https://api.apollo.io/v1/contacts/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloKey
      },
      body: JSON.stringify({
        domain: company_domain,
        limit: 5,
        person_titles: ['CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP', 'Director', 'Head of']
      })
    });

    const apolloData = await apolloResponse.json();
    const contacts = apolloData.contacts || [];

    const createdContacts = [];
    for (const contact of contacts) {
      const contactRecord = {
        company_id,
        company_name,
        company_domain,
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
        const created = await base44.asServiceRole.entities.Contact.create(contactRecord);
        createdContacts.push(created);
      }
    }

    // Transition to intel_gathering after enrichment
    if (createdContacts.length > 0 && jobPipeline.stage === 'saved') {
      await base44.asServiceRole.entities.JobPipeline.update(jobPipeline.id, { stage: 'intel_gathering' });
    }

    console.log(`Enrichment completed: ${createdContacts.length} contacts created for ${company_name}`);
    return Response.json({
      status: 'success',
      contacts_created: createdContacts.length,
      enriched_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});