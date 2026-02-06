import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Auto-create default RSS feeds for new users
// Call this function after user completes profile setup

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's candidate profile to personalize feeds
    const profiles = await base44.entities.CandidateProfile.list('-created_date', 1);
    const profile = profiles[0];
    
    // Generate feeds based on user preferences
    const feeds = [];
    
    if (profile && profile.target_roles && profile.target_roles.length > 0) {
      // Create feeds for each target role and location combination
      const roles = profile.target_roles || [];
      const locations = profile.preferred_locations || [''];
      
      for (const role of roles) {
        for (const location of locations.slice(0, 3)) { // Limit to top 3 locations
          const encodedRole = encodeURIComponent(role);
          const encodedLocation = encodeURIComponent(location);
          
          feeds.push({
            feed_name: `Indeed - ${role}${location ? ` in ${location}` : ''}`,
            feed_url: `https://www.indeed.com/rss?q=${encodedRole}${location ? `&l=${encodedLocation}` : ''}&sort=date`,
            refresh_frequency: "every_4_hours",
            status: "active"
          });
        }
      }
      
      // Add general remote job feeds
      feeds.push({
        feed_name: "We Work Remotely",
        feed_url: "https://weworkremotely.com/remote-jobs.rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      });
      
      feeds.push({
        feed_name: "RemoteOK - Remote Jobs",
        feed_url: "https://remoteok.com/remote-jobs.rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      });
    } else {
      // Fallback to default executive feeds if no profile
      feeds.push(
        {
          feed_name: "Indeed - CFO Jobs",
          feed_url: "https://www.indeed.com/rss?q=CFO+OR+%22Chief+Financial+Officer%22&sort=date",
          refresh_frequency: "every_4_hours",
          status: "active"
        },
        {
          feed_name: "Indeed - CTO Jobs",
          feed_url: "https://www.indeed.com/rss?q=CTO+OR+%22Chief+Technology+Officer%22&sort=date",
          refresh_frequency: "every_4_hours",
          status: "active"
        },
        {
          feed_name: "Indeed - CMO Jobs",
          feed_url: "https://www.indeed.com/rss?q=CMO+OR+%22Chief+Marketing+Officer%22&sort=date",
          refresh_frequency: "every_4_hours",
          status: "active"
        },
        {
          feed_name: "We Work Remotely",
          feed_url: "https://weworkremotely.com/remote-jobs.rss",
          refresh_frequency: "every_4_hours",
          status: "active"
        }
      );
    }
    
    const DEFAULT_FEEDS = feeds;
    
    // Create all default feeds
    await base44.entities.RSSFeed.bulkCreate(
      DEFAULT_FEEDS.map(feed => ({
        ...feed,
        jobs_found: 0,
        last_updated: new Date().toISOString()
      }))
    );
    
    return Response.json({ 
      success: true,
      message: 'Default RSS feeds created',
      count: DEFAULT_FEEDS.length,
      feeds: DEFAULT_FEEDS.map(f => f.feed_name)
    });
    
  } catch (error) {
    console.error('Error creating default feeds:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});