import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`Resetting job data for user: ${user.email}`);
    
    // Get counts before deletion
    const openRoles = await base44.asServiceRole.entities.OpenRole.list('-created_date', 10000);
    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 10000);
    const contacts = await base44.asServiceRole.entities.Contact.list('-created_date', 10000);
    const applications = await base44.asServiceRole.entities.Application.list('-created_date', 10000);
    const outreach = await base44.asServiceRole.entities.OutreachMessage.list('-created_date', 10000);
    const activities = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 10000);
    const jobPipeline = await base44.asServiceRole.entities.JobPipeline.list('-created_date', 10000);
    const companyPipeline = await base44.asServiceRole.entities.CompanyPipeline.list('-created_date', 10000);
    const suggestions = await base44.asServiceRole.entities.SuggestedCompany.list('-created_date', 10000);
    const discoveryRuns = await base44.asServiceRole.entities.DiscoveryRun.list('-created_date', 10000);
    
    // Get user's data
    const userRoles = openRoles.filter(r => r.created_by === user.email);
    const userCompanies = companies.filter(c => c.created_by === user.email);
    const userContacts = contacts.filter(c => c.created_by === user.email);
    const userApplications = applications.filter(a => a.created_by === user.email);
    const userOutreach = outreach.filter(o => o.created_by === user.email);
    const userActivities = activities.filter(a => a.created_by === user.email);
    const userJobPipeline = jobPipeline.filter(j => j.created_by === user.email);
    const userCompanyPipeline = companyPipeline.filter(c => c.created_by === user.email);
    const userSuggestions = suggestions.filter(s => s.created_by === user.email);
    const userDiscoveryRuns = discoveryRuns.filter(d => d.created_by === user.email);
    
    console.log(`Found ${userRoles.length} jobs, ${userCompanies.length} companies to delete`);
    
    // Delete user's job data
    for (const role of userRoles) {
      await base44.asServiceRole.entities.OpenRole.delete(role.id);
    }
    
    for (const company of userCompanies) {
      await base44.asServiceRole.entities.Company.delete(company.id);
    }
    
    for (const contact of userContacts) {
      await base44.asServiceRole.entities.Contact.delete(contact.id);
    }
    
    for (const app of userApplications) {
      await base44.asServiceRole.entities.Application.delete(app.id);
    }
    
    for (const msg of userOutreach) {
      await base44.asServiceRole.entities.OutreachMessage.delete(msg.id);
    }
    
    for (const activity of userActivities) {
      await base44.asServiceRole.entities.ActivityLog.delete(activity.id);
    }
    
    for (const job of userJobPipeline) {
      await base44.asServiceRole.entities.JobPipeline.delete(job.id);
    }
    
    for (const comp of userCompanyPipeline) {
      await base44.asServiceRole.entities.CompanyPipeline.delete(comp.id);
    }
    
    for (const suggestion of userSuggestions) {
      await base44.asServiceRole.entities.SuggestedCompany.delete(suggestion.id);
    }
    
    for (const run of userDiscoveryRuns) {
      await base44.asServiceRole.entities.DiscoveryRun.delete(run.id);
    }
    
    // Get preserved data counts
    const profiles = await base44.asServiceRole.entities.CandidateProfile.list('-created_date', 100);
    const userProfiles = profiles.filter(p => p.created_by === user.email);
    
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 100);
    const userFeeds = rssFeeds.filter(f => f.created_by === user.email);
    
    console.log(`Reset complete. Deleted ${userRoles.length} jobs, ${userCompanies.length} companies`);
    
    return Response.json({
      success: true,
      message: 'Job data reset complete',
      deleted: {
        openRoles: userRoles.length,
        companies: userCompanies.length,
        contacts: userContacts.length,
        applications: userApplications.length,
        outreach: userOutreach.length,
        activities: userActivities.length,
        jobPipeline: userJobPipeline.length,
        companyPipeline: userCompanyPipeline.length,
        suggestions: userSuggestions.length,
        discoveryRuns: userDiscoveryRuns.length
      },
      preserved: {
        profiles: userProfiles.length,
        rssFeeds: userFeeds.length
      }
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});