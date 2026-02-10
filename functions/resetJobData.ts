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

    // Get all entities (use list instead of filter to avoid created_by issues)
    const openRoles = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const contacts = await base44.asServiceRole.entities.Contact.list('-created_date', 1000);
    const jobPipelines = await base44.asServiceRole.entities.JobPipeline.list('-created_date', 1000);
    const applications = await base44.asServiceRole.entities.Application.list('-created_date', 1000);
    const outreach = await base44.asServiceRole.entities.OutreachMessage.list('-created_date', 1000);
    const activities = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 1000);
    const discoveryRuns = await base44.asServiceRole.entities.DiscoveryRun.list('-run_at', 1000);
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 1000);

    console.log(`Found: ${openRoles.length} jobs, ${companies.length} companies, ${rssFeeds.length} feeds`);

    let deletedCount = 0;

    // Delete jobs
    for (const role of openRoles) {
      try {
        await base44.asServiceRole.entities.OpenRole.delete(role.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete job ${role.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} jobs`);

    // Delete companies
    deletedCount = 0;
    for (const company of companies) {
      try {
        await base44.asServiceRole.entities.Company.delete(company.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete company ${company.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} companies`);

    // Delete contacts
    deletedCount = 0;
    for (const contact of contacts) {
      try {
        await base44.asServiceRole.entities.Contact.delete(contact.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete contact ${contact.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} contacts`);

    // Delete job pipelines
    deletedCount = 0;
    for (const pipeline of jobPipelines) {
      try {
        await base44.asServiceRole.entities.JobPipeline.delete(pipeline.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete pipeline ${pipeline.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} pipelines`);

    // Delete applications
    deletedCount = 0;
    for (const app of applications) {
      try {
        await base44.asServiceRole.entities.Application.delete(app.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete application ${app.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} applications`);

    // Delete outreach
    deletedCount = 0;
    for (const msg of outreach) {
      try {
        await base44.asServiceRole.entities.OutreachMessage.delete(msg.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete outreach ${msg.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} outreach messages`);

    // Delete activities
    deletedCount = 0;
    for (const activity of activities) {
      try {
        await base44.asServiceRole.entities.ActivityLog.delete(activity.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete activity ${activity.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} activities`);

    // Delete discovery runs
    deletedCount = 0;
    for (const run of discoveryRuns) {
      try {
        await base44.asServiceRole.entities.DiscoveryRun.delete(run.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete run ${run.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} discovery runs`);

    // Delete RSS feeds
    deletedCount = 0;
    for (const feed of rssFeeds) {
      try {
        await base44.asServiceRole.entities.RSSFeed.delete(feed.id);
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete feed ${feed.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedCount} RSS feeds`);

    // Create new RSS feeds with correct URLs
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

    console.log('=== RESET COMPLETE ===');

    return Response.json({
      success: true,
      message: 'Job data reset and RSS feeds recreated successfully',
      deleted: {
        openRoles: openRoles.length,
        companies: companies.length,
        contacts: contacts.length,
        jobPipelines: jobPipelines.length,
        applications: applications.length,
        outreach: outreach.length,
        activities: activities.length,
        discoveryRuns: discoveryRuns.length,
        rssFeeds: rssFeeds.length
      },
      created: {
        rssFeeds: defaultFeeds.length
      }
    });
  } catch (error) {
    console.error('Reset job data error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});