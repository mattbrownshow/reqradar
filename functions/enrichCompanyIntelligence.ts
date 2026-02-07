import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { company_id, company_name } = await req.json();

    if (!company_id || !company_name) {
      return Response.json({ error: 'Missing company_id or company_name' }, { status: 400 });
    }

    // Update company status to enriching
    await base44.entities.Company.update(company_id, { enrichment_status: 'enriching' });

    // Get Apollo data
    const apolloCompany = await getApolloCompanyData(company_name);

    if (!apolloCompany) {
      await base44.entities.Company.update(company_id, {
        enrichment_status: 'failed',
        enrichment_error: 'Company not found in Apollo'
      });
      return Response.json({ error: 'Company not found in Apollo' }, { status: 404 });
    }

    // Get hiring signals from Amplemarket if we have domain
    let signals = [];
    if (apolloCompany.domain) {
      signals = await getAmplemarketSignals(apolloCompany.domain);
    }

    // Update company with enriched data
    await base44.entities.Company.update(company_id, {
      domain: apolloCompany.domain,
      industry: apolloCompany.industry,
      sub_sector: apolloCompany.sub_sector,
      employee_count: apolloCompany.employee_count,
      revenue_estimate: apolloCompany.revenue_estimate,
      founded_year: apolloCompany.founded_year,
      description: apolloCompany.description,
      linkedin_url: apolloCompany.linkedin_url,
      tech_stack: apolloCompany.tech_stack || [],
      employee_growth_rate: apolloCompany.employee_growth_rate,
      hiring_signals: signals,
      intelligence_signals: signals.length > 0 ? [signals[0]?.signal || 'Hiring activity detected'] : [],
      apollo_id: apolloCompany.apollo_id,
      enrichment_status: 'complete',
      last_enriched: new Date().toISOString()
    });

    // Find and enrich decision makers
    await findAndEnrichContacts(base44, company_id, company_name, apolloCompany);

    return Response.json({
      success: true,
      company: apolloCompany,
      signals: signals
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getApolloCompanyData(companyName) {
  const apiKey = Deno.env.get('APOLLO_API_KEY');
  if (!apiKey) throw new Error('APOLLO_API_KEY not set');

  const response = await fetch('https://api.apollo.io/v1/organizations/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      q_organization_name: companyName,
      page: 1,
      per_page: 1
    })
  });

  const data = await response.json();

  if (!data.organizations || data.organizations.length === 0) {
    return null;
  }

  const company = data.organizations[0];

  return {
    name: company.name,
    domain: company.website_url,
    industry: company.industry,
    sub_sector: company.sub_sector,
    employee_count: company.estimated_num_employees,
    revenue_estimate: company.annual_revenue ? `$${company.annual_revenue}` : null,
    founded_year: company.founded_year,
    description: company.short_description,
    linkedin_url: company.linkedin_url,
    tech_stack: company.technologies || [],
    employee_growth_rate: company.employee_growth_rate,
    apollo_id: company.id
  };
}

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
    name: person.name,
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
      source: 'merged_apollo_lusha'
    };
  } catch (error) {
    console.error('Lusha enrichment failed:', error);
    return contact;
  }
}

async function getAmplemarketSignals(domain) {
  const apiKey = Deno.env.get('AMPLEMARKET_API_KEY');
  if (!apiKey) return [];

  try {
    const response = await fetch(`https://api.amplemarket.com/v1/companies/${domain}/signals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();

    const signals = [];

    if (data.hiring_activity?.length > 0) {
      signals.push({
        type: 'hiring',
        signal: `Hiring: ${data.hiring_activity[0]}`
      });
    }

    if (data.funding?.length > 0) {
      signals.push({
        type: 'funding',
        signal: `Funding: ${data.funding[0]}`
      });
    }

    if (data.news?.length > 0) {
      signals.push({
        type: 'news',
        signal: `News: ${data.news[0]}`
      });
    }

    return signals;
  } catch (error) {
    console.error('Amplemarket signals failed:', error);
    return [];
  }
}

async function findAndEnrichContacts(base44, companyId, companyName, apolloCompany) {
  try {
    const relevantTitles = [
      'CEO', 'CTO', 'VP Engineering', 'VP Technology', 'Head of Engineering',
      'Chief Technology Officer', 'VP Sales', 'VP Business Development',
      'SVP', 'Director'
    ];

    const contacts = await getApolloContacts(companyName, relevantTitles);

    const enrichedContacts = [];

    for (const contact of contacts) {
      let enriched = contact;

      // Enrich with Lusha
      enriched = await enrichWithLusha(enriched, companyName);

      // Check if contact already exists
      const existing = await base44.entities.Contact.filter({
        company_id: companyId,
        email: contact.email
      });

      if (existing && existing.length > 0) {
        // Update existing
        await base44.entities.Contact.update(existing[0].id, {
          full_name: enriched.name,
          first_name: enriched.first_name,
          last_name: enriched.last_name,
          title: enriched.title,
          email: enriched.email,
          email_verified: enriched.email_verified,
          phone: enriched.phone,
          linkedin_url: enriched.linkedin_url,
          seniority: enriched.seniority,
          department: enriched.department,
          data_sources: [enriched.source, 'lusha'],
          last_updated: new Date().toISOString()
        });
      } else {
        // Create new
        await base44.entities.Contact.create({
          company_id: companyId,
          company_name: companyName,
          company_domain: apolloCompany.domain,
          full_name: enriched.name,
          first_name: enriched.first_name,
          last_name: enriched.last_name,
          title: enriched.title,
          email: enriched.email,
          email_verified: enriched.email_verified,
          phone: enriched.phone,
          linkedin_url: enriched.linkedin_url,
          seniority: enriched.seniority,
          department: enriched.department,
          data_sources: [enriched.source, 'lusha'],
          last_updated: new Date().toISOString()
        });
      }

      enrichedContacts.push(enriched);
    }

    console.log(`✅ Found and enriched ${enrichedContacts.length} contacts`);
  } catch (error) {
    console.error('Contact enrichment failed:', error);
  }
}