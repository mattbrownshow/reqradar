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
    
    // Default RSS feeds for executive and general job search
    const DEFAULT_FEEDS = [
      // Executive-focused feeds
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
        feed_name: "Indeed - C-Suite Executive Jobs",
        feed_url: "https://www.indeed.com/rss?q=C-Suite+OR+Executive&sort=date",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      
      // General job board RSS feeds
      {
        feed_name: "CareerJet - Job Search",
        feed_url: "https://www.careerjet.com/search/rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Adzuna - Job Feed",
        feed_url: "https://www.adzuna.com/feed/jobs",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "SimplyHired - Job Search",
        feed_url: "https://www.simplyhired.com/search/rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Jooble - Job Listings",
        feed_url: "https://jooble.org/rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "USAJobs - Federal Jobs",
        feed_url: "https://www.usajobs.gov/Search/RSSFeed",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Dice - Tech Jobs",
        feed_url: "https://www.dice.com/jobs/rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      
      // Remote job feeds
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
      
      // Specialized feeds
      {
        feed_name: "CryptoJobsList - Crypto Jobs",
        feed_url: "https://cryptojobslist.com/jobs/rss",
        refresh_frequency: "every_4_hours",
        status: "active"
      },
      {
        feed_name: "Google News - Jobs",
        feed_url: "https://news.google.com/rss/search?q=jobs",
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