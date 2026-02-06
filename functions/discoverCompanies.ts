import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { industries, companySizes, fundingStages, locations, keywords } = await req.json();
    
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
    if (!APOLLO_API_KEY) {
      return Response.json({ error: 'Apollo API key not configured' }, { status: 500 });
    }

    // Map our size ranges to Apollo format
    const sizeMap = {
      '1-50': '1,50',
      '51-200': '51,200',
      '201-1000': '201,1000',
      '1000+': '1001,max'
    };
    
    const apolloSizes = companySizes?.map(s => sizeMap[s]).filter(Boolean);

    // Query Apollo API
    const response = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify({
        organization_num_employees_ranges: apolloSizes || undefined,
        organization_locations: locations || undefined,
        q_organization_keyword_tags: industries || undefined,
        page: 1,
        per_page: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Apollo API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Get user's candidate profile for match scoring
    const profiles = await base44.entities.CandidateProfile.list('-created_date', 1);
    const profile = profiles[0] || {};

    // Transform and score companies
    const companies = (data.organizations || []).map(org => {
      const matchScore = calculateMatchScore(org, profile, { industries, companySizes, locations });
      
      return {
        apolloId: org.id,
        name: org.name,
        domain: org.website_url,
        industry: org.industry,
        subSector: org.industry_tag_list?.[0],
        employeeCount: org.estimated_num_employees,
        revenue: org.estimated_annual_revenue,
        location: org.city && org.state ? `${org.city}, ${org.state}` : org.country,
        city: org.city,
        state: org.state,
        country: org.country,
        fundingStage: org.funding_stage,
        logoUrl: org.logo_url,
        description: org.short_description,
        matchScore
      };
    });

    return Response.json({
      companies,
      count: companies.length
    });

  } catch (error) {
    console.error('Error discovering companies:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateMatchScore(org, profile, searchFilters) {
  let score = 50; // Base score

  // Industry match
  if (profile.industries?.length > 0 && org.industry) {
    const hasMatch = profile.industries.some(ind => 
      org.industry.toLowerCase().includes(ind.toLowerCase())
    );
    if (hasMatch) score += 20;
  }

  // Size match
  if (profile.company_sizes?.length > 0 && org.estimated_num_employees) {
    const empCount = org.estimated_num_employees;
    const matchesSize = profile.company_sizes.some(size => {
      if (size === '1-50' && empCount <= 50) return true;
      if (size === '51-200' && empCount >= 51 && empCount <= 200) return true;
      if (size === '201-1000' && empCount >= 201 && empCount <= 1000) return true;
      if (size === '1000+' && empCount > 1000) return true;
      return false;
    });
    if (matchesSize) score += 15;
  }

  // Funding stage match
  if (profile.funding_stages?.length > 0 && org.funding_stage) {
    const hasMatch = profile.funding_stages.some(stage => 
      org.funding_stage.toLowerCase().includes(stage.toLowerCase())
    );
    if (hasMatch) score += 10;
  }

  // Location match
  if (profile.preferred_locations?.length > 0 && (org.city || org.state)) {
    const orgLocation = `${org.city}, ${org.state}`.toLowerCase();
    const hasMatch = profile.preferred_locations.some(loc => 
      orgLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(org.city?.toLowerCase())
    );
    if (hasMatch) score += 15;
  }

  return Math.min(Math.max(score, 0), 100);
}