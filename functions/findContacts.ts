import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyDomain, companyName, titles } = await req.json();
    
    if (!companyDomain && !companyName) {
      return Response.json({ error: 'Company domain or name required' }, { status: 400 });
    }

    const LUSHA_API_KEY = Deno.env.get('LUSHA_API_KEY');
    const AMPLEMARKET_API_KEY = Deno.env.get('AMPLEMARKET_API_KEY');
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    let allContacts = [];

    // Try Lusha API
    if (LUSHA_API_KEY) {
      try {
        const lushaContacts = await fetchLushaContacts(LUSHA_API_KEY, { companyDomain, titles });
        allContacts.push(...lushaContacts);
      } catch (error) {
        console.error('Lusha API error:', error);
      }
    }

    // Try Amplemarket API
    if (AMPLEMARKET_API_KEY && allContacts.length < 10) {
      try {
        const ampleContacts = await fetchAmplemarketContacts(AMPLEMARKET_API_KEY, { companyDomain, companyName, titles });
        allContacts.push(...ampleContacts);
      } catch (error) {
        console.error('Amplemarket API error:', error);
      }
    }

    // Try Apollo API
    if (APOLLO_API_KEY && allContacts.length < 10) {
      try {
        const apolloContacts = await fetchApolloContacts(APOLLO_API_KEY, { companyDomain, companyName, titles });
        allContacts.push(...apolloContacts);
      } catch (error) {
        console.error('Apollo API error:', error);
      }
    }

    // Deduplicate by email
    const uniqueContacts = new Map();
    allContacts.forEach(contact => {
      const key = contact.email || `${contact.full_name}-${contact.title}`;
      if (!uniqueContacts.has(key)) {
        uniqueContacts.set(key, contact);
      }
    });

    const contacts = Array.from(uniqueContacts.values());

    return Response.json({
      contacts,
      count: contacts.length,
      sources: {
        lusha: LUSHA_API_KEY ? true : false,
        amplemarket: AMPLEMARKET_API_KEY ? true : false,
        apollo: APOLLO_API_KEY ? true : false
      }
    });

  } catch (error) {
    console.error('Error finding contacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchLushaContacts(apiKey, { companyDomain, titles }) {
  const searchParams = new URLSearchParams();
  if (companyDomain) searchParams.append('companyDomain', companyDomain);
  if (titles?.length > 0) searchParams.append('title', titles.join(','));
  searchParams.append('limit', '20');

  const response = await fetch(`https://api.lusha.com/person?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'api_key': apiKey, 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(`Lusha API error: ${response.status}`);

  const data = await response.json();
  return (data.data || []).map(person => ({
    full_name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
    title: person.title,
    email: person.emailAddresses?.[0],
    phone: person.phoneNumbers?.[0],
    linkedin_url: person.linkedInUrl,
    verified: person.emailAddresses?.[0] ? true : false,
    data_source: 'lusha'
  })).filter(c => c.full_name);
}

async function fetchAmplemarketContacts(apiKey, { companyDomain, companyName, titles }) {
  const filters = {};
  if (companyDomain) filters.company_domain = companyDomain;
  if (companyName) filters.company_name = companyName;
  if (titles?.length > 0) filters.title = titles;

  const response = await fetch('https://api.amplemarket.com/api/v1/contacts/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, limit: 20 })
  });

  if (!response.ok) throw new Error(`Amplemarket API error: ${response.status}`);

  const data = await response.json();
  return (data.contacts || []).map(contact => ({
    full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedin_url,
    verified: contact.email_verified || false,
    data_source: 'amplemarket'
  })).filter(c => c.full_name);
}

async function fetchApolloContacts(apiKey, { companyDomain, companyName, titles }) {
  const body = {
    page: 1,
    per_page: 20,
    person_titles: titles || []
  };
  
  if (companyDomain) body.organization_domains = [companyDomain];
  if (companyName) body.q_organization_name = companyName;

  const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apiKey },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Apollo API error: ${response.status}`);

  const data = await response.json();
  return (data.people || []).map(person => ({
    full_name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
    title: person.title,
    email: person.email,
    phone: person.phone_numbers?.[0],
    linkedin_url: person.linkedin_url,
    verified: person.email_status === 'verified',
    data_source: 'apollo'
  })).filter(c => c.full_name);
}