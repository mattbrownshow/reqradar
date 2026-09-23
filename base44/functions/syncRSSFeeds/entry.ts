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
    const existingUrls = new Set(existingFeeds.map(f => f.feed_url));
    
    const feedsToAdd = [];
    const locationType = profile.location_type || 'remote_only';
    const locations = profile.preferred_locations || [];
    
    // Generate feeds based on location preference
    if (locationType === 'remote_only' || locationType === 'both') {
      // Add remote job boards
      const remoteFeeds = [
        {
          feed_name: "We Work Remotely",
          feed_url: "https://weworkremotely.com/remote-jobs.rss",
          refresh_frequency: "every_4_hours",
          status: "active"
        },
        {
          feed_name: "RemoteOK",
          feed_url: "https://remoteok.com/remote-jobs.rss",
          refresh_frequency: "every_4_hours",
          status: "active"
        },
        {
          feed_name: "Remote.co",
          feed_url: "https://remote.co/remote-jobs/rss",
          refresh_frequency: "every_4_hours",
          status: "active"
        }
      ];
      
      remoteFeeds.forEach(feed => {
        if (!existingUrls.has(feed.feed_url)) {
          feedsToAdd.push(feed);
        }
      });
    }
    
    // Note: Location-specific RSS feeds are limited
    // Most job boards don't support RSS with location filtering
    // We'll rely on post-fetch filtering in the discovery function
    
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
      target_roles: profile.target_roles,
      location_type: locationType,
      locations: locations,
      feeds_added: feedsToAdd.length,
      total_active_feeds: existingFeeds.length + feedsToAdd.length
    });
    
  } catch (error) {
    console.error('Error syncing RSS feeds:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});