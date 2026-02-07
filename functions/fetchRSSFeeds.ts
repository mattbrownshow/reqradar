import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('=== fetchRSSFeeds started ===');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('No authenticated user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Auth user: ${user.email}`);

    // Get user's target roles - get all profiles and filter by user email
    const allProfiles = await base44.asServiceRole.entities.CandidateProfile.list('-created_date', 100);
    const profile = allProfiles.find(p => p.created_by === user.email);
    const targetRoles = profile?.target_roles || [];
    
    console.log(`User: ${user.email}, Found profile: ${profile ? 'yes' : 'no'}, Target Roles: ${targetRoles.join(', ') || 'NONE'}`);

    // Get all active RSS feeds
    const allFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 100);
    const feeds = allFeeds.filter(f => f.status === 'active');
    
    console.log(`Found ${feeds.length} active feeds`);
    
    if (!feeds || feeds.length === 0) {
      console.log('No active feeds found');
      return Response.json({ 
        success: true,
        message: 'No active feeds to sync',
        jobs_created: 0
      });
    }

    let totalJobsCreated = 0;
    const existingJobs = await base44.asServiceRole.entities.OpenRole.list('-created_date', 500);
    const existingUrls = new Set(existingJobs.map(j => j.source_url));
    
    console.log(`Target roles for filtering: ${targetRoles.join(', ')}, Existing jobs: ${existingUrls.size}`);

    // Fetch from Adzuna API
    try {
      console.log('Fetching jobs from Adzuna API...');
      const adzunaJobs = await fetchAdzunaJobs(targetRoles);
      console.log(`Fetched ${adzunaJobs.length} jobs from Adzuna`);
      
      if (adzunaJobs.length > 0) {
        const newAdzunaJobs = adzunaJobs.filter(j => !existingUrls.has(j.source_url));
        if (newAdzunaJobs.length > 0) {
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newAdzunaJobs);
          totalJobsCreated += newAdzunaJobs.length;
          console.log(`Created ${newAdzunaJobs.length} new jobs from Adzuna`);
        }
      }
    } catch (error) {
      console.error('Error fetching Adzuna jobs:', error);
    }

    // Fetch from SerpAPI (Google Jobs)
    try {
      console.log('Fetching jobs from SerpAPI (Google Jobs)...');
      const serpJobs = await fetchSerpAPIJobs(targetRoles);
      console.log(`Fetched ${serpJobs.length} jobs from SerpAPI`);
      
      if (serpJobs.length > 0) {
        const newSerpJobs = serpJobs.filter(j => !existingUrls.has(j.source_url));
        if (newSerpJobs.length > 0) {
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newSerpJobs);
          totalJobsCreated += newSerpJobs.length;
          console.log(`Created ${newSerpJobs.length} new jobs from SerpAPI`);
        }
      }
    } catch (error) {
      console.error('Error fetching SerpAPI jobs:', error);
    }

    // Fetch and parse each feed
    for (const feed of feeds) {
      try {
        const feedUrl = feed.feed_url;
        let jobs = [];

        // Skip API endpoints - they need special handling and have strict rate limiting
        if (feedUrl.includes('remotive.com') || feedUrl.includes('arbeitnow.com') || feedUrl.includes('themuse.com')) {
          console.log(`Skipping API endpoint: ${feed.feed_name}`);
          continue;
        }

        console.log(`Fetching RSS feed: ${feed.feed_name} from ${feedUrl}`);
        
        // Handle RSS feeds
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
        console.log(`Feed content length for ${feed.feed_name}: ${feedContent.length}`);
        jobs = parseRSSFeed(feedContent, feed.feed_name, feedUrl);
        console.log(`Parsed ${jobs.length} jobs from ${feed.feed_name}`);
        
        if (jobs.length === 0) {
          continue;
        }

        // Filter by target roles - match any keyword from role
        const roleKeywords = new Set();
        targetRoles.forEach(role => {
          role.toLowerCase().split(' ').forEach(word => {
            if (word.length > 2) roleKeywords.add(word);  // Lower threshold to 2 chars
          });
        });

        const matchedJobs = jobs.filter(job => {
          const titleDesc = (job.title + ' ' + job.description).toLowerCase();
          return Array.from(roleKeywords).some(keyword => titleDesc.includes(keyword));
        });
        
        console.log(`Feed: ${feed.feed_name}, Jobs: ${jobs.length}, Matched: ${matchedJobs.length}, Keywords: ${Array.from(roleKeywords).join(',')}`);

        // Filter out duplicates
        const newJobs = matchedJobs.filter(j => !existingUrls.has(j.source_url));
        
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

async function fetchRemotiveJobs(targetRoles) {
  const jobs = [];
  try {
    // Only fetch first role to avoid timeout
    const role = targetRoles[0];
    if (!role) return jobs;
    
    const response = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(role)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.jobs) {
        jobs.push(...data.jobs.slice(0, 10).map(job => ({
          title: job.title,
          company_name: job.company_name,
          description: job.description || '',
          location: job.job_region || 'Remote',
          work_type: 'Remote',
          source: 'Remotive',
          source_type: 'rss_feed',
          source_url: job.url,
          posted_date: new Date(job.publication_date).toISOString().split('T')[0],
          status: 'new',
          match_score: 0
        })));
      }
    }
  } catch (error) {
    console.error('Error fetching Remotive jobs:', error.message);
  }
  return jobs;
}

async function fetchArbeitnowJobs(targetRoles) {
  const jobs = [];
  try {
    // Only fetch first role to avoid timeout
    const role = targetRoles[0];
    if (!role) return jobs;
    
    const response = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(role)}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        jobs.push(...data.slice(0, 10).map(job => ({
          title: job.title,
          company_name: job.company_name,
          description: job.description || '',
          location: job.location || 'Remote',
          work_type: 'Remote',
          source: 'Arbeitnow',
          source_type: 'rss_feed',
          source_url: job.url,
          posted_date: job.posted_at ? new Date(job.posted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'new',
          match_score: 0
        })));
      }
    }
  } catch (error) {
    console.error('Error fetching Arbeitnow jobs:', error.message);
  }
  return jobs;
}

async function fetchTheMuseJobs(targetRoles) {
  const jobs = [];
  try {
    // Only fetch first role to avoid timeout
    const role = targetRoles[0];
    if (!role) return jobs;
    
    const response = await fetch(`https://www.themuse.com/api/public/jobs?search=${encodeURIComponent(role)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.results) {
        jobs.push(...data.results.slice(0, 10).map(job => ({
          title: job.name,
          company_name: job.company?.name || 'Unknown',
          description: job.contents || '',
          location: job.locations?.[0]?.name || 'Remote',
          work_type: 'Remote',
          source: 'The Muse',
          source_type: 'rss_feed',
          source_url: job.refs?.landing_page,
          posted_date: job.published_at ? new Date(job.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'new',
          match_score: 0
        })));
      }
    }
  } catch (error) {
    console.error('Error fetching The Muse jobs:', error.message);
  }
  return jobs;
}

async function fetchAdzunaJobs(targetRoles) {
  const jobs = [];
  try {
    const apiKey = Deno.env.get('ADZUNA_API_KEY');
    if (!apiKey) {
      console.error('ADZUNA_API_KEY not set');
      return jobs;
    }

    // Fetch jobs for each target role
    for (const role of targetRoles.slice(0, 3)) {  // Limit to first 3 roles to avoid rate limiting
      try {
        const params = new URLSearchParams({
          app_id: 'flowzyn_jobs',
          app_key: apiKey,
          results_per_page: '30',
          what: role,
          where: 'US',
          full_time: 'true',
          permanent: 'true'
        });

        const response = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.results && Array.isArray(data.results)) {
            jobs.push(...data.results.map(job => ({
              title: job.title.substring(0, 200),
              company_name: job.company.display_name.substring(0, 100),
              description: job.description ? job.description.substring(0, 1000) : '',
              location: job.location?.display_name || 'US',
              work_type: 'On-site',
              source: 'Adzuna',
              source_type: 'rss_feed',
              source_url: job.redirect_url,
              posted_date: new Date(job.created).toISOString().split('T')[0],
              status: 'new',
              match_score: 0
            })));
          }
        }
      } catch (error) {
        console.error(`Error fetching Adzuna jobs for role "${role}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in fetchAdzunaJobs:', error.message);
  }
  return jobs;
}

async function fetchSerpAPIJobs(targetRoles) {
  const jobs = [];
  try {
    const apiKey = Deno.env.get('SERPAPI_API_KEY');
    if (!apiKey) {
      console.error('SERPAPI_API_KEY not set');
      return jobs;
    }

    // Fetch jobs for each target role
    for (const role of targetRoles.slice(0, 3)) {  // Limit to first 3 roles to avoid rate limiting
      try {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_jobs',
          q: role,
          location: 'United States',
          num: '30'
        });

        const response = await fetch(`https://serpapi.com/search?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.jobs_results && Array.isArray(data.jobs_results)) {
            jobs.push(...data.jobs_results.map(job => ({
              title: job.title.substring(0, 200),
              company_name: job.company_name.substring(0, 100),
              description: job.description ? job.description.substring(0, 1000) : '',
              location: job.location || 'United States',
              work_type: job.employment_type || 'Full-time',
              source: 'Google Jobs (SerpAPI)',
              source_type: 'rss_feed',
              source_url: job.apply_link || job.link,
              posted_date: new Date().toISOString().split('T')[0],
              status: 'new',
              match_score: 0
            })));
          }
        }
      } catch (error) {
        console.error(`Error fetching SerpAPI jobs for role "${role}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in fetchSerpAPIJobs:', error.message);
  }
  return jobs;
}

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