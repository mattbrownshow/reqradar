import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MAX_CONTACTS_PER_COMPANY = 3;
const DAILY_ENRICHMENT_LIMIT = 25;
const CACHE_DAYS = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { company_id } = await req.json();
    
    if (!company_id) {
      return Response.json({ error: 'company_id required' }, { status: 400 });
    }

    // Get company
    const companies = await base44.entities.Company.filter({ id: company_id });
    if (companies.length === 0) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }
    const company = companies[0];

    // Check if already enriched within cache period
    if (company.last_enriched) {
      const daysSinceEnrichment = (Date.now() - new Date(company.last_enriched).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEnrichment < CACHE_DAYS) {
        const existingContacts = await base44.entities.Contact.filter({ company_id });
        return Response.json({
          success: true,
          cached: true,
          contacts: existingContacts,
          message: `Using cached contacts from ${Math.floor(daysSinceEnrichment)} days ago`
        });
      }
    }

    // Check daily enrichment limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const allContacts = await base44.entities.Contact.filter({ created_by: user.email });
    const todayContacts = allContacts.filter(c => new Date(c.created_date) >= todayStart);
    
    if (todayContacts.length >= DAILY_ENRICHMENT_LIMIT) {
      return Response.json({ 
        error: `Daily enrichment limit reached (${DAILY_ENRICHMENT_LIMIT} contacts/day)`,
        limit_reached: true,
        used: todayContacts.length,
        limit: DAILY_ENRICHMENT_LIMIT
      }, { status: 429 });
    }

    const remainingQuota = DAILY_ENRICHMENT_LIMIT - todayContacts.length;
    const contactsToFetch = Math.min(MAX_CONTACTS_PER_COMPANY, remainingQuota);

    // Get user's target departments and seniority levels
    const profiles = await base44.entities.CandidateProfile.filter({ email: user.email });
    const profile = profiles[0] || {};
    
    const targetDepartments = profile.target_departments || [];
    const targetSeniority = profile.target_seniority_levels || [];

    if (targetDepartments.length === 0 && targetSeniority.length === 0) {
      return Response.json({ 
        error: 'Please configure target departments and seniority levels in Settings first' 
      }, { status: 400 });
    }

    // Map departments to API formats
    const apolloDepts = mapToApollo(targetDepartments);
    const lushaDepts = mapToLusha(targetDepartments);
    const amplemarketDepts = mapToAmplemarket(targetDepartments);

    // Enrich from APIs
    const contacts = [];
    
    // Try Apollo
    if (Deno.env.get('APOLLO_API_KEY') && company.domain) {
      const apolloContacts = await queryApollo(company, apolloDepts, targetSeniority, contactsToFetch);
      contacts.push(...apolloContacts);
    }

    // Try Lusha if we need more
    if (contacts.length < contactsToFetch && Deno.env.get('LUSHA_API_KEY') && company.domain) {
      const lushaContacts = await queryLusha(company, lushaDepts, targetSeniority, contactsToFetch - contacts.length);
      contacts.push(...lushaContacts);
    }

    // Try Amplemarket if we still need more
    if (contacts.length < contactsToFetch && Deno.env.get('AMPLEMARKET_API_KEY') && company.domain) {
      const amplemarketContacts = await queryAmplemarket(company, amplemarketDepts, targetSeniority, contactsToFetch - contacts.length);
      contacts.push(...amplemarketContacts);
    }

    // Deduplicate
    const uniqueContacts = deduplicateContacts(contacts);
    const finalContacts = uniqueContacts.slice(0, contactsToFetch);

    // Store contacts
    const storedContacts = [];
    for (const contact of finalContacts) {
      const created = await base44.entities.Contact.create({
        company_id: company.id,
        company_name: company.name,
        company_domain: company.domain,
        full_name: contact.name,
        first_name: contact.firstName,
        last_name: contact.lastName,
        title: contact.title,
        email: contact.email,
        email_verified: contact.emailVerified,
        email_source: contact.source,
        phone: contact.phone,
        phone_source: contact.source,
        linkedin_url: contact.linkedin,
        linkedin_source: contact.source,
        data_sources: [contact.source],
        data_quality_score: contact.emailVerified ? 90 : 70,
        seniority: contact.seniority,
        department: contact.department
      });
      storedContacts.push(created);
    }

    // Update company enrichment status
    await base44.entities.Company.update(company.id, {
      enrichment_status: 'complete',
      last_enriched: new Date().toISOString()
    });

    return Response.json({
      success: true,
      contacts: storedContacts,
      count: storedContacts.length,
      sources_used: [...new Set(finalContacts.map(c => c.source))],
      daily_quota_used: todayContacts.length + storedContacts.length,
      daily_quota_limit: DAILY_ENRICHMENT_LIMIT
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// API query functions
async function queryApollo(company, departments, seniorities, limit) {
  try {
    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': Deno.env.get('APOLLO_API_KEY')
      },
      body: JSON.stringify({
        q_organization_domains: company.domain,
        person_departments: departments,
        person_seniorities: seniorities,
        per_page: limit
      })
    });

    const data = await response.json();
    
    return (data.people || []).map(person => ({
      name: person.name,
      firstName: person.first_name,
      lastName: person.last_name,
      title: person.title,
      email: person.email,
      emailVerified: person.email_status === 'verified',
      phone: person.phone_numbers?.[0]?.raw_number,
      linkedin: person.linkedin_url,
      seniority: person.seniority,
      department: person.departments?.[0],
      source: 'apollo'
    }));
  } catch (error) {
    console.error('Apollo error:', error);
    return [];
  }
}

async function queryLusha(company, departments, seniorities, limit) {
  try {
    const response = await fetch('https://api.lusha.com/person', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LUSHA_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company: { domain: company.domain },
        property: { 
          departments: departments,
          seniorities: seniorities 
        },
        limit
      })
    });

    const data = await response.json();
    
    return (data.data || []).map(person => ({
      name: `${person.firstName} ${person.lastName}`,
      firstName: person.firstName,
      lastName: person.lastName,
      title: person.jobTitle,
      email: person.emailAddress,
      emailVerified: true,
      phone: person.phoneNumber,
      linkedin: person.linkedInUrl,
      seniority: person.seniority,
      department: person.department,
      source: 'lusha'
    }));
  } catch (error) {
    console.error('Lusha error:', error);
    return [];
  }
}

async function queryAmplemarket(company, departments, seniorities, limit) {
  try {
    const response = await fetch('https://api.amplemarket.com/api/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('AMPLEMARKET_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: {
          company_domains: [company.domain],
          departments: departments,
          seniority_levels: seniorities
        },
        limit
      })
    });

    const data = await response.json();
    
    return (data.contacts || []).map(person => ({
      name: `${person.first_name} ${person.last_name}`,
      firstName: person.first_name,
      lastName: person.last_name,
      title: person.job_title,
      email: person.email,
      emailVerified: person.email_verified,
      phone: person.phone,
      linkedin: person.linkedin_url,
      seniority: person.seniority,
      department: person.department,
      source: 'amplemarket'
    }));
  } catch (error) {
    console.error('Amplemarket error:', error);
    return [];
  }
}

function deduplicateContacts(contacts) {
  const seen = new Map();
  
  for (const contact of contacts) {
    const key = contact.email || `${contact.name}_${contact.title}`;
    if (!seen.has(key)) {
      seen.set(key, contact);
    } else {
      const existing = seen.get(key);
      if (contact.emailVerified && !existing.emailVerified) {
        seen.set(key, contact);
      }
    }
  }
  
  return Array.from(seen.values());
}

// Department mapping functions
function mapToApollo(departments) {
  const map = {
    "Executive / Leadership": ["C-Suite", "Founder", "Owner"],
    "Engineering / Technology": ["Engineering & Technical", "Information Technology"],
    "Product": ["Product"],
    "Sales / Revenue": ["Sales", "Revenue", "Business Development"],
    "Marketing": ["Marketing"],
    "Finance": ["Finance", "Accounting"],
    "Operations": ["Operations"],
    "Human Resources / Talent": ["Human Resources", "Talent"],
    "Legal": ["Legal"]
  };
  
  return departments.flatMap(dept => map[dept] || []);
}

function mapToLusha(departments) {
  const map = {
    "Executive / Leadership": ["Senior Leadership", "C-Suite"],
    "Engineering / Technology": ["Engineering & Technical", "Information Technology"],
    "Product": ["Product"],
    "Sales / Revenue": ["Revenue", "Sales"],
    "Marketing": ["Marketing"],
    "Finance": ["Finance"],
    "Operations": ["Operations"],
    "Human Resources / Talent": ["Human Resources", "Talent Acquisition"],
    "Legal": ["Legal"]
  };
  
  return departments.flatMap(dept => map[dept] || []);
}

function mapToAmplemarket(departments) {
  const map = {
    "Executive / Leadership": ["C-Suite", "General Management"],
    "Engineering / Technology": ["Engineering & Technical"],
    "Product": ["Product"],
    "Sales / Revenue": ["Sales", "Business Development"],
    "Marketing": ["Marketing"],
    "Finance": ["Finance"],
    "Operations": ["Operations"],
    "Human Resources / Talent": ["Human Resources", "Talent"],
    "Legal": ["Legal"]
  };
  
  return departments.flatMap(dept => map[dept] || []);
}