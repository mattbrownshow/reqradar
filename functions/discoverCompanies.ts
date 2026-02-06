import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { industries, companySizes, fundingStages, locations, keywords } = await req.json();
    
    const LUSHA_API_KEY = Deno.env.get('LUSHA_API_KEY');
    const AMPLEMARKET_API_KEY = Deno.env.get('AMPLEMARKET_API_KEY');
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');

    let allCompanies = [];

    // Try Lusha API first
    if (LUSHA_API_KEY) {
      try {
        const lushaCompanies = await fetchLushaCompanies(LUSHA_API_KEY, { industries, companySizes, locations, keywords });
        allCompanies.push(...lushaCompanies);
      } catch (error) {
        console.error('Lusha API error:', error);
      }
    }

    // Try Amplemarket API if we don't have enough results
    if (AMPLEMARKET_API_KEY && allCompanies.length < 30) {
      try {
        const ampleCompanies = await fetchAmplemarketCompanies(AMPLEMARKET_API_KEY, { industries, companySizes, locations, keywords });
        allCompanies.push(...ampleCompanies);
      } catch (error) {
        console.error('Amplemarket API error:', error);
      }
    }

    // Try Apollo API if we still need more results
    if (APOLLO_API_KEY && allCompanies.length < 30) {
      try {
        const apolloCompanies = await fetchApolloCompanies(APOLLO_API_KEY, { industries, companySizes, locations, keywords });
        allCompanies.push(...apolloCompanies);
      } catch (error) {
        console.error('Apollo API error:', error);
      }
    }

    if (allCompanies.length === 0) {
      return Response.json({ error: 'No API keys configured or all APIs failed' }, { status: 500 });
    }
    
    // Get user's candidate profile for match scoring
    const profiles = await base44.entities.CandidateProfile.list('-created_date', 1);
    const profile = profiles[0] || {};

    // Score and deduplicate companies
    const uniqueCompanies = new Map();
    allCompanies.forEach(company => {
      const key = company.domain || company.name.toLowerCase();
      if (!uniqueCompanies.has(key) || (uniqueCompanies.get(key).matchScore || 0) < (company.matchScore || 0)) {
        uniqueCompanies.set(key, company);
      }
    });

    const companies = Array.from(uniqueCompanies.values())
      .map(company => ({
        ...company,
        matchScore: calculateMatchScore(company, profile, { industries, companySizes, locations })
      }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 50);

    return Response.json({
      companies,
      count: companies.length,
      sources: {
        lusha: LUSHA_API_KEY ? true : false,
        amplemarket: AMPLEMARKET_API_KEY ? true : false,
        apollo: APOLLO_API_KEY ? true : false
      }
    });

  } catch (error) {
    console.error('Error discovering companies:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchLushaCompanies(apiKey, { industries, companySizes, locations, keywords }) {
  const body = {
    filters: {},
    limit: 50
  };
  
  if (industries?.length > 0) body.filters.industry = industries;
  if (companySizes?.length > 0) body.filters.company_size = companySizes;
  if (locations?.length > 0) body.filters.location = locations;
  if (keywords) body.filters.keywords = keywords;

  const response = await fetch('https://api.lusha.com/v2/company/search', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Lusha API error: ${response.status}`);

  const data = await response.json();
  return (data.results || []).map(company => ({
    lushaId: company.id,
    name: company.name,
    domain: company.website,
    industry: company.industry,
    subSector: company.sub_industry,
    employeeCount: company.employee_count,
    revenue: company.revenue,
    location: company.city && company.state 
      ? `${company.city}, ${company.state}` 
      : company.country,
    fundingStage: company.funding_stage,
    logoUrl: company.logo_url,
    description: company.description,
    source: 'lusha'
  }));
}

async function fetchAmplemarketCompanies(apiKey, { industries, companySizes, locations, keywords }) {
  const filters = {};
  if (industries?.length > 0) filters.industry = industries;
  if (companySizes?.length > 0) filters.company_size = companySizes;
  if (locations?.length > 0) filters.location = locations;
  if (keywords) filters.q = keywords;

  const response = await fetch('https://api.amplemarket.com/api/v1/companies/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, limit: 50 })
  });

  if (!response.ok) throw new Error(`Amplemarket API error: ${response.status}`);

  const data = await response.json();
  return (data.companies || []).map(company => ({
    amplemarketId: company.id,
    name: company.name,
    domain: company.domain || company.website,
    industry: company.industry,
    subSector: company.sub_industry,
    employeeCount: company.employee_count,
    revenue: company.revenue,
    location: company.headquarters || company.location,
    fundingStage: company.funding_stage,
    logoUrl: company.logo_url,
    description: company.description,
    source: 'amplemarket'
  }));
}

async function fetchApolloCompanies(apiKey, { industries, companySizes, locations, keywords }) {
  const body = {
    page: 1,
    per_page: 50
  };
  
  if (industries?.length > 0) body.organization_industry_tags = industries;
  if (companySizes?.length > 0) body.organization_num_employees_ranges = companySizes;
  if (locations?.length > 0) body.organization_locations = locations;
  if (keywords) body.q_organization_name = keywords;

  const response = await fetch('https://api.apollo.io/v1/organizations/search', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey 
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Apollo API error: ${response.status}`);

  const data = await response.json();
  return (data.organizations || []).map(org => ({
    apolloId: org.id,
    name: org.name,
    domain: org.primary_domain || org.website_url,
    industry: org.industry,
    subSector: org.sub_industry,
    employeeCount: org.estimated_num_employees,
    revenue: org.estimated_annual_revenue,
    location: `${org.city || ''}, ${org.state || ''}`.trim().replace(/^,|,$/g, ''),
    fundingStage: org.funding_stage,
    logoUrl: org.logo_url,
    description: org.short_description,
    source: 'apollo'
  }));
}

function calculateMatchScore(company, profile, searchFilters) {
  let score = 50;

  if (profile.industries?.length > 0 && company.industry) {
    const hasMatch = profile.industries.some(ind => 
      company.industry.toLowerCase().includes(ind.toLowerCase())
    );
    if (hasMatch) score += 20;
  }

  if (profile.company_sizes?.length > 0 && company.employeeCount) {
    const empCount = company.employeeCount;
    const matchesSize = profile.company_sizes.some(size => {
      if (size === '1-50' && empCount <= 50) return true;
      if (size === '51-200' && empCount >= 51 && empCount <= 200) return true;
      if (size === '201-1000' && empCount >= 201 && empCount <= 1000) return true;
      if (size === '1000+' && empCount > 1000) return true;
      return false;
    });
    if (matchesSize) score += 15;
  }

  if (profile.funding_stages?.length > 0 && company.fundingStage) {
    const hasMatch = profile.funding_stages.some(stage => 
      company.fundingStage.toLowerCase().includes(stage.toLowerCase())
    );
    if (hasMatch) score += 10;
  }

  if (profile.preferred_locations?.length > 0 && company.location) {
    const hasMatch = profile.preferred_locations.some(loc => 
      company.location.toLowerCase().includes(loc.toLowerCase())
    );
    if (hasMatch) score += 15;
  }

  return Math.min(Math.max(score, 0), 100);
}