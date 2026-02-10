import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if feeds already exist
    const existingFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 10);
    
    if (existingFeeds.length === 0) {
      console.log('No feeds found, creating defaults...');
      
      // Create ONLY real RSS feeds (not API endpoints)
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
      console.log(`Created ${defaultFeeds.length} default feeds`);
      
      return Response.json({
        success: true,
        message: `Created ${defaultFeeds.length} default RSS feeds`,
        feeds: defaultFeeds
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