import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { companyDomain, companyName, titles } = await req.json();

    if (!companyDomain && !companyName) {
      return Response.json({ error: 'Missing companyDomain or companyName' }, { status: 400 });
    }

    const jobTitles = titles || [
      'CEO', 'CTO', 'VP Engineering', 'VP Technology', 'Head of Engineering',
      'Chief Technology Officer', 'VP Sales', 'VP Business Development'
    ];

    // Get contacts from Apollo
    const apolloContacts = await getApolloContacts(companyName, jobTitles);

    const enrichedContacts = [];

    // Enrich each with Lusha
    for (const contact of apolloContacts) {
      let enriched = contact;

      enriched = await enrichWithLusha(enriched, companyName);
      enrichedContacts.push(enriched);
    }

    return Response.json({
      success: true,
      data: {
        contacts: enrichedContacts
      }
    });

  } catch (error) {
    console.error('Find contacts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getApolloContacts(companyName, jobTitles) {
  const apiKey = Deno.env.get('APOLLO_API_KEY');
  if (!apiKey) throw new Error('APOLLO_API_KEY not set');

  const response = await fetch('https://api.apollo.io/v1/people/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      q_organization_name: companyName,
      person_titles: jobTitles,
      page: 1,
      per_page: 25
    })
  });

  const data = await response.json();

  if (!data.people) {
    return [];
  }

  return data.people.map(person => ({
    full_name: person.name,
    first_name: person.first_name,
    last_name: person.last_name,
    title: person.title,
    email: person.email,
    email_verified: person.email_status === 'verified',
    phone: person.phone_numbers?.[0]?.raw_number,
    linkedin_url: person.linkedin_url,
    seniority: person.seniority,
    department: person.departments?.[0],
    source: 'apollo'
  }));
}

async function enrichWithLusha(contact, companyName) {
  const apiKey = Deno.env.get('LUSHA_API_KEY');
  if (!apiKey) return contact;

  try {
    const response = await fetch('https://api.lusha.com/person', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      },
      body: JSON.stringify({
        firstName: contact.first_name,
        lastName: contact.last_name,
        company: companyName,
        ...(contact.linkedin_url && { linkedinUrl: contact.linkedin_url })
      })
    });

    const data = await response.json();

    return {
      ...contact,
      email: data.emailAddresses?.[0]?.email || contact.email,
      email_verified: data.emailAddresses?.[0]?.verified || contact.email_verified,
      phone: data.phoneNumbers?.[0]?.internationalNumber || contact.phone,
      linkedin_url: data.linkedinUrl || contact.linkedin_url,
      title: data.currentPositions?.[0]?.title || contact.title,
      data_sources: ['apollo', 'lusha']
    };
  } catch (error) {
    console.error('Lusha enrichment failed:', error);
    return {
      ...contact,
      data_sources: ['apollo']
    };
  }
}