import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting data reset for user:', user.email);

    // Get all user records to delete with proper limits
    const [profiles, companies, roles, applications, pipelines, outreach, activities, suggestions, runs, feeds, companyPipelines] = await Promise.all([
      base44.entities.CandidateProfile.list('', 1000).catch(() => []),
      base44.entities.Company.list('', 1000).catch(() => []),
      base44.entities.OpenRole.list('', 1000).catch(() => []),
      base44.entities.Application.list('', 1000).catch(() => []),
      base44.entities.JobPipeline.list('', 1000).catch(() => []),
      base44.entities.OutreachMessage.list('', 1000).catch(() => []),
      base44.entities.ActivityLog.list('', 1000).catch(() => []),
      base44.entities.SuggestedCompany.list('', 1000).catch(() => []),
      base44.entities.DiscoveryRun.list('', 1000).catch(() => []),
      base44.entities.RSSFeed.list('', 1000).catch(() => []),
      base44.entities.CompanyPipeline.list('', 1000).catch(() => [])
    ]);

    console.log('Found records - profiles:', profiles.length, 'companies:', companies.length, 'roles:', roles.length);

    // Delete all records in batches
    const deletePromises = [];
    
    if (profiles.length > 0) deletePromises.push(...profiles.map(p => base44.entities.CandidateProfile.delete(p.id).catch(e => console.log('Delete profile error:', e))));
    if (companies.length > 0) deletePromises.push(...companies.map(c => base44.entities.Company.delete(c.id).catch(e => console.log('Delete company error:', e))));
    if (roles.length > 0) deletePromises.push(...roles.map(r => base44.entities.OpenRole.delete(r.id).catch(e => console.log('Delete role error:', e))));
    if (applications.length > 0) deletePromises.push(...applications.map(a => base44.entities.Application.delete(a.id).catch(e => console.log('Delete application error:', e))));
    if (pipelines.length > 0) deletePromises.push(...pipelines.map(p => base44.entities.JobPipeline.delete(p.id).catch(e => console.log('Delete pipeline error:', e))));
    if (outreach.length > 0) deletePromises.push(...outreach.map(o => base44.entities.OutreachMessage.delete(o.id).catch(e => console.log('Delete outreach error:', e))));
    if (activities.length > 0) deletePromises.push(...activities.map(a => base44.entities.ActivityLog.delete(a.id).catch(e => console.log('Delete activity error:', e))));
    if (suggestions.length > 0) deletePromises.push(...suggestions.map(s => base44.entities.SuggestedCompany.delete(s.id).catch(e => console.log('Delete suggestion error:', e))));
    if (runs.length > 0) deletePromises.push(...runs.map(r => base44.entities.DiscoveryRun.delete(r.id).catch(e => console.log('Delete run error:', e))));
    if (feeds.length > 0) deletePromises.push(...feeds.map(f => base44.entities.RSSFeed.delete(f.id).catch(e => console.log('Delete feed error:', e))));
    if (companyPipelines.length > 0) deletePromises.push(...companyPipelines.map(cp => base44.entities.CompanyPipeline.delete(cp.id).catch(e => console.log('Delete company pipeline error:', e))));

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    console.log('Data reset completed successfully');

    return Response.json({
      success: true,
      message: 'All user data has been reset'
    });
  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});