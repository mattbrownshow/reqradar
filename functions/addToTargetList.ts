import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyData } = await req.json();
    
    // Check if company already exists by apolloId or domain
    const existingCompanies = await base44.entities.Company.filter({
      domain: companyData.domain
    });

    let company;
    if (existingCompanies.length > 0) {
      company = existingCompanies[0];
    } else {
      // Create new company with all available fields
      company = await base44.entities.Company.create({
        name: companyData.name,
        domain: companyData.domain,
        industry: companyData.industry || 'Not specified',
        sub_sector: companyData.subSector,
        employee_count: companyData.employeeCount || 0,
        revenue_estimate: companyData.revenue?.toString(),
        location: companyData.location || 'Not specified',
        description: companyData.description || '',
        funding_stage: companyData.fundingStage,
        match_score: companyData.matchScore || 50,
        logo_url: companyData.logoUrl,
        tracked: true,
        pipeline_stage: 'research'
      });
    }

    // Log activity
    await base44.entities.ActivityLog.create({
      type: 'company_added',
      title: `Added ${company.name} to target list`,
      company_name: company.name,
      entity_id: company.id
    });

    return Response.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('Error adding to target list:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});