import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if feeds already exist
    const existingFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 10);
    
    if (existingFeeds.length === 0) {
      console.log('No feeds found, creating defaults...');
      
      // Create default feeds
      const defaultFeeds = [
        {
          feed_name: 'Adzuna API - Job Search',
          feed_url: 'https://api.adzuna.com/v1/api/jobs/us/search',
          status: 'active',
          jobs_found: 0,
          last_updated: new Date().toISOString()
        },
        {
          feed_name: 'SerpAPI - Google Jobs',
          feed_url: 'https://serpapi.com/search',
          status: 'active',
          jobs_found: 0,
          last_updated: new Date().toISOString()
        },
        {
          feed_name: 'Serper - Google Jobs',
          feed_url: 'https://google.serper.dev/jobs',
          status: 'active',
          jobs_found: 0,
          last_updated: new Date().toISOString()
        },
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
        }
      ];
      
      await base44.asServiceRole.entities.RSSFeed.bulkCreate(defaultFeeds);
      console.log(`Created ${defaultFeeds.length} default feeds`);
      
      return Response.json({
        success: true,
        message: `Created ${defaultFeeds.length} default RSS feeds`
      });
    } else {
      console.log(`${existingFeeds.length} feeds already exist`);
      return Response.json({
        success: true,
        message: `${existingFeeds.length} feeds already configured`
      });
    }
  } catch (error) {
    console.error('Error initializing feeds:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});