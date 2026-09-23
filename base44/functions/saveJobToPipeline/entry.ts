import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // Step 1: Get the job details
    const job = await base44.entities.OpenRole.get(job_id);

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Step 2: Find or create company record
    let companyId = job.company_id;

    if (!companyId && job.company_name) {
      // Try to find existing company by name
      const existingCompanies = await base44.entities.Company.filter({ 
        name: job.company_name 
      });

      if (existingCompanies.length > 0) {
        companyId = existingCompanies[0].id;
        
        // Update the job to link to this company
        await base44.entities.OpenRole.update(job_id, {
          company_id: companyId
        });
      } else {
        // Create new company record
        const newCompany = await base44.entities.Company.create({
          name: job.company_name,
          industry: job.industry || null,
          tracked: false
        });
        companyId = newCompany.id;

        // Update the job to link to this company
        await base44.entities.OpenRole.update(job_id, {
          company_id: companyId
        });
      }
    }

    // Step 3: Check if already in pipeline
    const existingPipeline = await base44.entities.JobPipeline.filter({
      job_id: job_id
    });

    if (existingPipeline.length > 0) {
      return Response.json({ 
        message: 'Job already in pipeline',
        pipeline_item: existingPipeline[0]
      });
    }

    // Step 4: Create pipeline entry with proper company link
    const pipelineItem = await base44.entities.JobPipeline.create({
      job_id: job_id,
      company_id: companyId,
      stage: 'saved',
      priority: 'medium',
      saved_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      pipeline_item: pipelineItem,
      company_id: companyId
    });

  } catch (error) {
    console.error('Error saving job to pipeline:', error);
    return Response.json({ 
      error: error.message || 'Failed to save job to pipeline' 
    }, { status: 500 });
  }
});