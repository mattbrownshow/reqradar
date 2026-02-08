import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user records to delete
    const profiles = await base44.entities.CandidateProfile.filter({ created_by: user.email });
    const companies = await base44.entities.Company.filter({ created_by: user.email });
    const roles = await base44.entities.OpenRole.filter({ created_by: user.email });
    const applications = await base44.entities.Application.filter({ created_by: user.email });
    const pipelines = await base44.entities.JobPipeline.filter({ created_by: user.email });
    const outreach = await base44.entities.OutreachMessage.filter({ created_by: user.email });
    const activities = await base44.entities.ActivityLog.filter({ created_by: user.email });
    const suggestions = await base44.entities.SuggestedCompany.filter({ created_by: user.email });
    const runs = await base44.entities.DiscoveryRun.filter({ created_by: user.email });
    const feeds = await base44.entities.RSSFeed.filter({ created_by: user.email });
    const companyPipelines = await base44.entities.CompanyPipeline.filter({ created_by: user.email });

    // Delete all records
    const deletePromises = [
      ...profiles.map(p => base44.entities.CandidateProfile.delete(p.id)),
      ...companies.map(c => base44.entities.Company.delete(c.id)),
      ...roles.map(r => base44.entities.OpenRole.delete(r.id)),
      ...applications.map(a => base44.entities.Application.delete(a.id)),
      ...pipelines.map(p => base44.entities.JobPipeline.delete(p.id)),
      ...outreach.map(o => base44.entities.OutreachMessage.delete(o.id)),
      ...activities.map(a => base44.entities.ActivityLog.delete(a.id)),
      ...suggestions.map(s => base44.entities.SuggestedCompany.delete(s.id)),
      ...runs.map(r => base44.entities.DiscoveryRun.delete(r.id)),
      ...feeds.map(f => base44.entities.RSSFeed.delete(f.id)),
      ...companyPipelines.map(cp => base44.entities.CompanyPipeline.delete(cp.id))
    ];

    await Promise.all(deletePromises);

    return Response.json({
      success: true,
      message: 'All user data has been reset'
    });
  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});