import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sync RSS feeds with user's current target roles
// Called when user updates their profile

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's candidate profile
    const profiles = await base44.entities.CandidateProfile.list('-created_date', 1);
    const profile = profiles[0];
    
    if (!profile || !profile.target_roles || profile.target_roles.length === 0) {
      return Response.json({ error: 'No target roles set' }, { status: 400 });
    }
    
    // Get existing feeds
    const existingFeeds = await base44.entities.RSSFeed.list('-created_date', 100);
    
    // Skip creating Indeed feeds - they block RSS requests
    // Instead, rely on public API sources (Remotive, Arbeitnow, The Muse) which handle role-based filtering
    const newFeeds = [];
    
    // Add remote job feeds and public APIs if not already present
    const remoteFeeds = [
      {
        feed_name: "We Work Remotely",
        feed_url: "https://weworkremotely.com/remote-jobs.rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "RemoteOK - Remote Jobs",
        feed_url: "https://remoteok.com/remote-jobs.rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Remotive - Remote Jobs API",
        feed_url: "https://remotive.com/api/remote-jobs",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Arbeitnow - Job Board API",
        feed_url: "https://www.arbeitnow.com/api/job-board-api",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "The Muse - Jobs API",
        feed_url: "https://www.themuse.com/developers/api/v2/jobs",
        refresh_frequency: "every_4_hours",
        status: "active"
      }
    ];
    
    // Check which feeds to add (avoid duplicates)
    const existingUrls = new Set(existingFeeds.map(f => f.feed_url));
    const feedsToAdd = newFeeds.filter(f => !existingUrls.has(f.feed_url));
    
    // Add remote feeds if not present
    const remoteToAdd = remoteFeeds.filter(f => !existingUrls.has(f.feed_url));
    feedsToAdd.push(...remoteToAdd);
    
    // Create new feeds
    if (feedsToAdd.length > 0) {
      await base44.entities.RSSFeed.bulkCreate(
        feedsToAdd.map(feed => ({
          ...feed,
          jobs_found: 0,
          last_updated: new Date().toISOString()
        }))
      );
    }
    
    return Response.json({
      success: true,
      message: 'RSS feeds synced with profile',
      feeds_added: feedsToAdd.length,
      feeds_removed: oldRoleFeeds.filter(f => !newFeeds.some(nf => nf.feed_url === f.feed_url)).length,
      total_active_feeds: (existingFeeds.length - oldRoleFeeds.length) + feedsToAdd.length
    });
    
  } catch (error) {
    console.error('Error syncing RSS feeds:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});