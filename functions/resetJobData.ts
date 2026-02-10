import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== STARTING DATA RESET ===');

    // Count entities before deletion
    const openRoles = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const contacts = await base44.asServiceRole.entities.Contact.list('-created_date', 1000);
    const jobPipelines = await base44.asServiceRole.entities.JobPipeline.list('-created_date', 1000);
    const companyPipelines = await base44.asServiceRole.entities.CompanyPipeline.list('-created_date', 1000);
    const applications = await base44.asServiceRole.entities.Application.list('-created_date', 1000);
    const outreach = await base44.asServiceRole.entities.OutreachMessage.list('-created_date', 1000);
    const activities = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 1000);
    const suggestions = await base44.asServiceRole.entities.SuggestedCompany.list('-created_date', 1000);
    const discoveryRuns = await base44.asServiceRole.entities.DiscoveryRun.list('-run_at', 1000);
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 1000);

    console.log(`Found: ${openRoles.length} jobs, ${companies.length} companies, ${rssFeeds.length} feeds`);

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
    
    // NEW: Also delete RSS feeds
    if (rssFeeds.length > 0) {
      deletePromises.push(...rssFeeds.map(f => base44.asServiceRole.entities.RSSFeed.delete(f.id)));
    }

    await Promise.all(deletePromises);
    console.log('✓ Deleted all data');

    // NEW: Recreate RSS feeds with correct URLs
    const defaultFeeds = [
      {
        feed_name: 'We Work Remotely - All Remote Jobs',
        feed_url: 'https://weworkremotely.com/remote-jobs.rss',
        status: 'active',
        jobs_found: 0,
        last_updated: new Date().toISOString()
      },
      {
        feed_name: 'RemoteOK - Remote Jobs',
        feed_url: 'https://remoteok.com/remote-jobs.rss',
        status: 'active',
        jobs_found: 0,
        last_updated: new Date().toISOString()
      },
      {
        feed_name: 'Remotive Jobs RSS',
        feed_url: 'https://remotive.com/api/remote-jobs/feed',
        status: 'active',
        jobs_found: 0,
        last_updated: new Date().toISOString()
      }
    ];
    
    await base44.asServiceRole.entities.RSSFeed.bulkCreate(defaultFeeds);
    console.log(`✓ Created ${defaultFeeds.length} RSS feeds`);

    // Get preserved data counts
    const profiles = await base44.asServiceRole.entities.CandidateProfile.list('-created_date', 100);

    console.log('=== RESET COMPLETE ===');

    return Response.json({
      success: true,
      message: 'Job data reset and RSS feeds recreated successfully',
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
        discoveryRuns: discoveryRuns.length,
        rssFeeds: rssFeeds.length
      },
      created: {
        rssFeeds: defaultFeeds.length
      },
      preserved: {
        profiles: profiles.length
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