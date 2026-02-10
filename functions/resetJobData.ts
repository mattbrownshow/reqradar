import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteInBatches(base44, entity, items, batchSize = 10) {
  let deleted = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => base44.asServiceRole.entities[entity].delete(item.id).catch(e => console.error(e))));
    deleted += batch.length;
    if (i + batchSize < items.length) {
      await sleep(200);
    }
  }
  return deleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting reset...');

    const openRoles = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const contacts = await base44.asServiceRole.entities.Contact.list('-created_date', 1000);
    const jobPipelines = await base44.asServiceRole.entities.JobPipeline.list('-created_date', 1000);
    const applications = await base44.asServiceRole.entities.Application.list('-created_date', 1000);
    const outreach = await base44.asServiceRole.entities.OutreachMessage.list('-created_date', 1000);
    const activities = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 1000);
    const discoveryRuns = await base44.asServiceRole.entities.DiscoveryRun.list('-run_at', 1000);
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 1000);

    await deleteInBatches(base44, 'OpenRole', openRoles);
    await deleteInBatches(base44, 'Company', companies);
    await deleteInBatches(base44, 'Contact', contacts);
    await deleteInBatches(base44, 'JobPipeline', jobPipelines);
    await deleteInBatches(base44, 'Application', applications);
    await deleteInBatches(base44, 'OutreachMessage', outreach);
    await deleteInBatches(base44, 'ActivityLog', activities);
    await deleteInBatches(base44, 'DiscoveryRun', discoveryRuns);
    await deleteInBatches(base44, 'RSSFeed', rssFeeds);

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

    return Response.json({
      success: true,
      message: 'Reset complete',
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
      created: { rssFeeds: 3 }
    });
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});