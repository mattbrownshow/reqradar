import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user records to delete
    const profiles = await base44.entities.CandidateProfile.list();
    const companies = await base44.entities.Company.list();
    const roles = await base44.entities.OpenRole.list();
    const applications = await base44.entities.Application.list();
    const pipelines = await base44.entities.JobPipeline.list();
    const outreach = await base44.entities.OutreachMessage.list();
    const activities = await base44.entities.ActivityLog.list();
    const suggestions = await base44.entities.SuggestedCompany.list();
    const runs = await base44.entities.DiscoveryRun.list();
    const feeds = await base44.entities.RSSFeed.list();
    const companyPipelines = await base44.entities.CompanyPipeline.list();

    // Delete all records in parallel
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