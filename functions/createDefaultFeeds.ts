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
    
    // Check if user already has feeds
    const existingFeeds = await base44.entities.RSSFeed.list('-created_date', 1);
    if (existingFeeds.length > 0) {
      return Response.json({ 
        message: 'Feeds already exist',
        count: existingFeeds.length 
      });
    }
    
    // Default RSS feeds for executive job search
    const DEFAULT_FEEDS = [
      {
        feed_name: "Indeed - Executive CFO Jobs",
        feed_url: "https://www.indeed.com/rss?q=CFO+OR+%22Chief+Financial+Officer%22&sort=date",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Indeed - Executive CTO Jobs",
        feed_url: "https://www.indeed.com/rss?q=CTO+OR+%22Chief+Technology+Officer%22&sort=date",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Indeed - Executive CMO Jobs",
        feed_url: "https://www.indeed.com/rss?q=CMO+OR+%22Chief+Marketing+Officer%22&sort=date",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Indeed - Executive COO Jobs",
        feed_url: "https://www.indeed.com/rss?q=COO+OR+%22Chief+Operating+Officer%22&sort=date",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "LinkedIn Jobs - C-Suite Roles",
        feed_url: "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=C-Suite%20Executive&location=United%20States&f_TPR=r86400",
        refresh_frequency: "every_4_hours",
        status: "active"
      }
    ];
    
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