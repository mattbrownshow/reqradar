import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active RSS feeds
    const feeds = await base44.entities.RSSFeed.filter({ status: 'active' });
    
    if (!feeds || feeds.length === 0) {
      return Response.json({ 
        success: true,
        message: 'No active feeds to sync',
        jobs_created: 0
      });
    }

    let totalJobsCreated = 0;
    const existingJobs = await base44.entities.OpenRole.list('-created_date', 500);
    const existingUrls = new Set(existingJobs.map(j => j.source_url));

    // Fetch and parse each feed
    for (const feed of feeds) {
      try {
        const feedUrl = feed.feed_url;
        
        // Skip API endpoints that need special handling
        if (feedUrl.includes('remotive.com') || feedUrl.includes('arbeitnow.com') || feedUrl.includes('themuse.com')) {
          continue; // These are handled by fetchJobsFromAPIs
        }

        // Fetch the feed
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Flowzyn/1.0)'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch feed ${feed.feed_name}: ${response.status}`);
          continue;
        }

        const feedContent = await response.text();
        
        // Parse RSS XML
        const jobs = parseRSSFeed(feedContent, feed.feed_name, feedUrl);
        
        if (jobs.length === 0) {
          continue;
        }

        // Filter out duplicates
        const newJobs = jobs.filter(j => !existingUrls.has(j.source_url));
        
        if (newJobs.length > 0) {
          // Create OpenRole records for new jobs
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newJobs);
          totalJobsCreated += newJobs.length;
          
          // Update feed job count
          await base44.asServiceRole.entities.RSSFeed.update(feed.id, {
            jobs_found: (feed.jobs_found || 0) + newJobs.length,
            last_updated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error processing feed ${feed.feed_name}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: 'RSS feeds synced',
      jobs_created: totalJobsCreated
    });
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function parseRSSFeed(xml, feedName, feedUrl) {
  const jobs = [];
  
  try {
    // Simple XML parsing for RSS feeds
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      
      // Extract fields
      const title = extractXMLValue(itemContent, 'title');
      const description = extractXMLValue(itemContent, 'description');
      const link = extractXMLValue(itemContent, 'link');
      const pubDate = extractXMLValue(itemContent, 'pubDate');
      const category = extractXMLValue(itemContent, 'category');
      
      if (!title || !link) continue;
      
      // Parse location from title or description
      const location = extractLocation(title, description);
      
      jobs.push({
        title: title.substring(0, 200),
        company_name: extractCompanyName(title, feedName),
        description: description ? description.substring(0, 1000) : '',
        location: location || 'Remote',
        work_type: 'Remote',
        source: feedName,
        source_type: 'rss_feed',
        source_url: link,
        posted_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: 'new',
        match_score: 0
      });
    }
  } catch (error) {
    console.error(`Failed to parse RSS feed: ${error.message}`);
  }
  
  return jobs;
}

function extractXMLValue(content, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = content.match(regex);
  if (match && match[1]) {
    return match[1]
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return '';
}

function extractLocation(title, description) {
  const combined = (title + ' ' + description).toLowerCase();
  
  // Common location patterns
  const locations = ['remote', 'nyc', 'new york', 'sf', 'san francisco', 'seattle', 'austin', 'denver', 'chicago', 'boston', 'los angeles'];
  
  for (const loc of locations) {
    if (combined.includes(loc)) {
      return loc.charAt(0).toUpperCase() + loc.slice(1);
    }
  }
  
  return 'Remote';
}

function extractCompanyName(title, feedName) {
  // Try to extract company name from title (usually at the end)
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return parts[parts.length - 1].trim().substring(0, 100);
  }
  
  // Fallback to feed name
  return feedName.replace(/Indeed - /i, '').substring(0, 100);
}