import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, companyDomain, targetTitle } = await req.json();
    
    if (!companyDomain || !targetTitle) {
      return Response.json({ error: 'Company domain and target title required' }, { status: 400 });
    }

    // 1. Check cache (30 days)
    const existingContacts = await base44.entities.Contact.filter({
      company_id: companyId,
      title: targetTitle
    });

    if (existingContacts.length > 0) {
      const contact = existingContacts[0];
      const daysSinceUpdate = (Date.now() - new Date(contact.updated_date).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 30) {
        return Response.json({ 
          success: true, 
          contact, 
          cached: true,
          message: 'Using cached contact data'
        });
      }
    }

    // 2. Query ALL THREE sources in parallel
    const LUSHA_API_KEY = Deno.env.get('LUSHA_API_KEY');
    const AMPLEMARKET_API_KEY = Deno.env.get('AMPLEMARKET_API_KEY');
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    const [apolloData, lushaData, amplemarketData] = await Promise.allSettled([
      APOLLO_API_KEY ? fetchApollo(APOLLO_API_KEY, companyDomain, targetTitle) : null,
      LUSHA_API_KEY ? fetchLusha(LUSHA_API_KEY, companyDomain, targetTitle) : null,
      AMPLEMARKET_API_KEY ? fetchAmplemarket(AMPLEMARKET_API_KEY, companyDomain, targetTitle) : null
    ]);

    const apollo = apolloData.status === 'fulfilled' ? apolloData.value : null;
    const lusha = lushaData.status === 'fulfilled' ? lushaData.value : null;
    const amplemarket = amplemarketData.status === 'fulfilled' ? amplemarketData.value : null;

    // 3. Merge intelligently
    const merged = mergeContactData(apollo, lusha, amplemarket);
    
    if (!merged) {
      return Response.json({
        success: false,
        error: 'Contact not found in any source',
        attempted_sources: {
          apollo: !!APOLLO_API_KEY,
          lusha: !!LUSHA_API_KEY,
          amplemarket: !!AMPLEMARKET_API_KEY
        }
      }, { status: 404 });
    }

    // 4. Calculate quality
    const quality = calculateDataQuality(merged);

    // 5. Save or update
    const contactData = {
      company_id: companyId,
      company_domain: companyDomain,
      full_name: merged.name,
      title: merged.title,
      email: merged.email,
      email_verified: merged.emailVerified || false,
      email_source: merged.emailSource,
      phone: merged.phone,
      phone_source: merged.phoneSource,
      linkedin_url: merged.linkedinUrl,
      linkedin_source: merged.linkedinSource,
      data_sources: merged.sources,
      data_quality_score: quality.score,
      data_quality_rating: quality.rating,
      apollo_data: apollo,
      lusha_data: lusha,
      amplemarket_data: amplemarket,
      is_primary: true
    };

    let savedContact;
    if (existingContacts.length > 0) {
      savedContact = await base44.entities.Contact.update(existingContacts[0].id, contactData);
    } else {
      savedContact = await base44.entities.Contact.create(contactData);
    }

    return Response.json({
      success: true,
      contact: savedContact,
      dataQuality: quality,
      cached: false,
      message: `Contact enriched from ${merged.sources.length} source(s)`
    });

  } catch (error) {
    console.error('Error enriching contact:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Fetch from Apollo
async function fetchApollo(apiKey, companyDomain, targetTitle) {
  const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      page: 1,
      per_page: 1,
      organization_domains: [companyDomain],
      person_titles: [targetTitle]
    })
  });

  if (!response.ok) throw new Error(`Apollo API error: ${response.status}`);

  const data = await response.json();
  const person = data.people?.[0];
  
  if (!person) return null;

  return {
    name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
    title: person.title,
    email: person.email,
    emailVerified: person.email_status === 'verified',
    phone: person.phone_numbers?.[0],
    linkedinUrl: person.linkedin_url
  };
}

// Fetch from Lusha
async function fetchLusha(apiKey, companyDomain, targetTitle) {
  const searchParams = new URLSearchParams({
    companyDomain: companyDomain,
    title: targetTitle,
    limit: '1'
  });

  const response = await fetch(`https://api.lusha.com/person?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'api_key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) throw new Error(`Lusha API error: ${response.status}`);

  const data = await response.json();
  const person = data.data?.[0];
  
  if (!person) return null;

  return {
    name: `${person.firstName || ''} ${person.lastName || ''}`.trim(),
    title: person.title,
    email: person.emailAddresses?.[0],
    emailVerified: !!person.emailAddresses?.[0],
    phone: person.phoneNumbers?.[0],
    linkedinUrl: person.linkedInUrl
  };
}

// Fetch from Amplemarket
async function fetchAmplemarket(apiKey, companyDomain, targetTitle) {
  const response = await fetch('https://api.amplemarket.com/api/v1/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filters: {
        company_domain: companyDomain,
        title: [targetTitle]
      },
      limit: 1
    })
  });

  if (!response.ok) throw new Error(`Amplemarket API error: ${response.status}`);

  const data = await response.json();
  const contact = data.contacts?.[0];
  
  if (!contact) return null;

  return {
    name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    title: contact.title,
    email: contact.email,
    emailVerified: contact.email_verified || false,
    phone: contact.phone,
    linkedinUrl: contact.linkedin_url
  };
}

// MERGE LOGIC - Combine data from 3 sources
function mergeContactData(apollo, lusha, amplemarket) {
  if (!apollo && !lusha && !amplemarket) return null;
  
  const sources = [];
  if (apollo) sources.push('apollo');
  if (lusha) sources.push('lusha');
  if (amplemarket) sources.push('amplemarket');
  
  const merged = { sources };
  
  // NAME: Prefer Apollo > Amplemarket > Lusha
  merged.name = apollo?.name || amplemarket?.name || lusha?.name;
  
  // TITLE: Prefer Apollo > Amplemarket > Lusha
  merged.title = apollo?.title || amplemarket?.title || lusha?.title;
  
  // EMAIL: Prefer VERIFIED email first, then Lusha > Amplemarket > Apollo
  const emails = [
    { email: lusha?.email, verified: lusha?.emailVerified, source: 'lusha' },
    { email: amplemarket?.email, verified: amplemarket?.emailVerified, source: 'amplemarket' },
    { email: apollo?.email, verified: apollo?.emailVerified, source: 'apollo' }
  ].filter(e => e.email);
  
  const verifiedEmail = emails.find(e => e.verified);
  const bestEmail = verifiedEmail || emails[0];
  
  if (bestEmail) {
    merged.email = bestEmail.email;
    merged.emailVerified = bestEmail.verified || false;
    merged.emailSource = bestEmail.source;
  }
  
  // PHONE: Prefer Lusha > Amplemarket > Apollo
  merged.phone = lusha?.phone || amplemarket?.phone || apollo?.phone;
  merged.phoneSource = lusha?.phone ? 'lusha' : 
                      amplemarket?.phone ? 'amplemarket' : 
                      apollo?.phone ? 'apollo' : null;
  
  // LINKEDIN: Prefer Apollo > Amplemarket > Lusha
  merged.linkedinUrl = apollo?.linkedinUrl || amplemarket?.linkedinUrl || lusha?.linkedinUrl;
  merged.linkedinSource = apollo?.linkedinUrl ? 'apollo' : 
                         amplemarket?.linkedinUrl ? 'amplemarket' : 
                         lusha?.linkedinUrl ? 'lusha' : null;
  
  return merged;
}

// QUALITY SCORING
function calculateDataQuality(contact) {
  let score = 0;
  const missingFields = [];
  
  if (contact.name) {
    score += 20;
  } else {
    missingFields.push('name');
  }
  
  if (contact.email) {
    score += 30;
  } else {
    missingFields.push('email');
  }
  
  if (contact.emailVerified) {
    score += 20;
  }
  
  if (contact.phone) {
    score += 15;
  } else {
    missingFields.push('phone');
  }
  
  if (contact.linkedinUrl) {
    score += 15;
  } else {
    missingFields.push('linkedin');
  }
  
  const rating = score >= 80 ? 'excellent' : 
                 score >= 60 ? 'good' : 
                 score >= 40 ? 'partial' : 'limited';
  
  return {
    score,
    rating,
    missingFields
  };
}