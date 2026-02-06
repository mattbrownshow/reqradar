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
    if (!LUSHA_API_KEY) {
      return Response.json({ error: 'Lusha API key not configured' }, { status: 500 });
    }

    // Build Lusha search query
    const searchParams = new URLSearchParams();
    
    // Add industry filter
    if (industries && industries.length > 0) {
      searchParams.append('industry', industries.join(','));
    }
    
    // Add company size filter
    if (companySizes && companySizes.length > 0) {
      const sizeRanges = companySizes.map(size => {
        switch(size) {
          case '1-50': return '1-50';
          case '51-200': return '51-200';
          case '201-1000': return '201-1000';
          case '1000+': return '1001+';
          default: return size;
        }
      }).join(',');
      searchParams.append('employeesRange', sizeRanges);
    }
    
    // Add location filter
    if (locations && locations.length > 0) {
      searchParams.append('location', locations.join(','));
    }
    
    // Add keywords if provided
    if (keywords) {
      searchParams.append('q', keywords);
    }
    
    searchParams.append('limit', '50');

    // Query Lusha API
    const response = await fetch(`https://api.lusha.com/companies?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'api_key': LUSHA_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Lusha API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Get user's candidate profile for match scoring
    const profiles = await base44.entities.CandidateProfile.list('-created_date', 1);
    const profile = profiles[0] || {};

    // Transform and score companies
    const companies = (data.data || []).map(company => {
      const matchScore = calculateMatchScore(company, profile, { industries, companySizes, locations });
      
      return {
        lushaId: company.id,
        name: company.name,
        domain: company.domain,
        industry: company.industry,
        subSector: company.subIndustry,
        employeeCount: company.companySize,
        revenue: company.revenue,
        location: company.location?.city && company.location?.state 
          ? `${company.location.city}, ${company.location.state}` 
          : company.location?.country,
        city: company.location?.city,
        state: company.location?.state,
        country: company.location?.country,
        fundingStage: company.fundingStage,
        logoUrl: company.logoUrl,
        description: company.description,
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