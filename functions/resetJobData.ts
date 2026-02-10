import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count entities before deletion
    const openRoles = await base44.asServiceRole.entities.OpenRole.filter({ created_by: user.email });
    const companies = await base44.asServiceRole.entities.Company.filter({ created_by: user.email });
    const contacts = await base44.asServiceRole.entities.Contact.filter({ created_by: user.email });
    const jobPipelines = await base44.asServiceRole.entities.JobPipeline.filter({ created_by: user.email });
    const companyPipelines = await base44.asServiceRole.entities.CompanyPipeline.filter({ created_by: user.email });
    const applications = await base44.asServiceRole.entities.Application.filter({ created_by: user.email });
    const outreach = await base44.asServiceRole.entities.OutreachMessage.filter({ created_by: user.email });
    const activities = await base44.asServiceRole.entities.ActivityLog.filter({ created_by: user.email });
    const suggestions = await base44.asServiceRole.entities.SuggestedCompany.filter({ created_by: user.email });
    const discoveryRuns = await base44.asServiceRole.entities.DiscoveryRun.filter({ created_by: user.email });

    // Delete all job-related data
    const deletePromises = [];
    
    if (openRoles.length > 0) {
      deletePromises.push(...openRoles.map(r => base44.asServiceRole.entities.OpenRole.delete(r.id)));
    }
    if (companies.length > 0) {
      deletePromises.push(...companies.map(c => base44.asServiceRole.entities.Company.delete(c.id)));
    }
    if (contacts.length > 0) {
      deletePromises.push(...contacts.map(c => base44.asServiceRole.entities.Contact.delete(c.id)));
    }
    if (jobPipelines.length > 0) {
      deletePromises.push(...jobPipelines.map(jp => base44.asServiceRole.entities.JobPipeline.delete(jp.id)));
    }
    if (companyPipelines.length > 0) {
      deletePromises.push(...companyPipelines.map(cp => base44.asServiceRole.entities.CompanyPipeline.delete(cp.id)));
    }
    if (applications.length > 0) {
      deletePromises.push(...applications.map(a => base44.asServiceRole.entities.Application.delete(a.id)));
    }
    if (outreach.length > 0) {
      deletePromises.push(...outreach.map(o => base44.asServiceRole.entities.OutreachMessage.delete(o.id)));
    }
    if (activities.length > 0) {
      deletePromises.push(...activities.map(a => base44.asServiceRole.entities.ActivityLog.delete(a.id)));
    }
    if (suggestions.length > 0) {
      deletePromises.push(...suggestions.map(s => base44.asServiceRole.entities.SuggestedCompany.delete(s.id)));
    }
    if (discoveryRuns.length > 0) {
      deletePromises.push(...discoveryRuns.map(dr => base44.asServiceRole.entities.DiscoveryRun.delete(dr.id)));
    }

    await Promise.all(deletePromises);

    // Get preserved data counts
    const profiles = await base44.asServiceRole.entities.CandidateProfile.filter({ created_by: user.email });
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.filter({ created_by: user.email });

    return Response.json({
      success: true,
      deleted: {
        openRoles: openRoles.length,
        companies: companies.length,
        contacts: contacts.length,
        jobPipelines: jobPipelines.length,
        companyPipelines: companyPipelines.length,
        applications: applications.length,
        outreach: outreach.length,
        activities: activities.length,
        suggestions: suggestions.length,
        discoveryRuns: discoveryRuns.length
      },
      preserved: {
        profiles: profiles.length,
        rssFeeds: rssFeeds.length
      }
    });
  } catch (error) {
    console.error('Reset job data error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});