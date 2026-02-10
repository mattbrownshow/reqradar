import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('=== DISCOVERY ENGINE STARTED ===');
    const startTime = Date.now();
    const base44 = createClientFromRequest(req);
    
    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log(`Running discovery for: ${user.email}`);
    
    // Create discovery run record
    const runRecord = await base44.asServiceRole.entities.DiscoveryRun.create({
      run_at: new Date().toISOString(),
      status: 'running',
      companies_found: 0,
      jobs_found: 0,
      career_pages_scanned: 0
    });
    
    // STEP 1: Get user's target roles
    const allProfiles = await base44.asServiceRole.entities.CandidateProfile.list('-created_date', 100);
    let profile = allProfiles.find(p => p.data?.setup_complete === true && p.data?.target_roles?.length > 0);
    
    // Fallback: if no complete profile with target roles found, try any profile with target roles
    if (!profile) {
      profile = allProfiles.find(p => p.data?.target_roles && p.data.target_roles.length > 0);
    }
    
    if (!profile || !profile.data?.target_roles || profile.data.target_roles.length === 0) {
      console.log(`Failed to find profile with target roles. User: ${user.email}, profiles found: ${allProfiles.length}`);
      console.log(`Profile search details: setup_complete=${profile?.data?.setup_complete}, target_roles=${profile?.data?.target_roles}`);
      await base44.asServiceRole.entities.DiscoveryRun.update(runRecord.id, {
        status: 'failed',
        error_message: 'No target roles configured',
        duration_ms: Date.now() - startTime
      });
      return Response.json({
        success: false,
        error: 'No target roles configured. Please complete your profile setup.',
        jobs_created: 0
      });
    }
    
    const targetRoles = profile.data.target_roles;
    console.log(`Target roles: ${targetRoles.join(', ')}`);
    
    // STEP 2: Get existing jobs to avoid duplicates
    const existingJobs = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    const existingUrls = new Set(existingJobs.map(j => j.source_url));
    console.log(`Existing jobs in database: ${existingUrls.size}`);
    
    let totalJobsCreated = 0;
    const results = {
      adzuna: { attempted: false, found: 0, created: 0, error: null },
      serpapi: { attempted: false, found: 0, created: 0, error: null },
      serper: { attempted: false, found: 0, created: 0, error: null },
      rss: { attempted: false, found: 0, created: 0, error: null }
    };
    
    // STEP 3: Fetch from Adzuna API
    const adzunaKey = Deno.env.get('ADZUNA_API_KEY');
    if (adzunaKey) {
      console.log('--- Fetching from Adzuna ---');
      results.adzuna.attempted = true;
      try {
        const adzunaJobs = await fetchAdzunaJobs(targetRoles, adzunaKey);
        results.adzuna.found = adzunaJobs.length;
        console.log(`Adzuna returned ${adzunaJobs.length} jobs`);
        
        const newJobs = adzunaJobs.filter(j => !existingUrls.has(j.source_url));
        if (newJobs.length > 0) {
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newJobs);
          results.adzuna.created = newJobs.length;
          totalJobsCreated += newJobs.length;
          console.log(`Created ${newJobs.length} new jobs from Adzuna`);
        }
      } catch (error) {
        results.adzuna.error = error.message;
        console.error('Adzuna error:', error.message);
      }
    } else {
      console.log('Adzuna API key not configured');
    }
    
    // STEP 4: Fetch from SerpAPI
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
    if (serpApiKey) {
      console.log('--- Fetching from SerpAPI ---');
      results.serpapi.attempted = true;
      try {
        const serpJobs = await fetchSerpAPIJobs(targetRoles, serpApiKey);
        results.serpapi.found = serpJobs.length;
        console.log(`SerpAPI returned ${serpJobs.length} jobs`);
        
        const newJobs = serpJobs.filter(j => !existingUrls.has(j.source_url));
        if (newJobs.length > 0) {
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newJobs);
          results.serpapi.created = newJobs.length;
          totalJobsCreated += newJobs.length;
          console.log(`Created ${newJobs.length} new jobs from SerpAPI`);
        }
      } catch (error) {
        results.serpapi.error = error.message;
        console.error('SerpAPI error:', error.message);
      }
    } else {
      console.log('SerpAPI key not configured');
    }
    
    // STEP 5: Fetch from Serper API
    const serperKey = Deno.env.get('SERPER_API_KEY');
    if (serperKey) {
      console.log('--- Fetching from Serper ---');
      results.serper.attempted = true;
      try {
        const serperJobs = await fetchSerperJobs(targetRoles, serperKey);
        results.serper.found = serperJobs.length;
        console.log(`Serper returned ${serperJobs.length} jobs`);
        
        const newJobs = serperJobs.filter(j => !existingUrls.has(j.source_url));
        if (newJobs.length > 0) {
          await base44.asServiceRole.entities.OpenRole.bulkCreate(newJobs);
          results.serper.created = newJobs.length;
          totalJobsCreated += newJobs.length;
          console.log(`Created ${newJobs.length} new jobs from Serper`);
        }
      } catch (error) {
        results.serper.error = error.message;
        console.error('Serper error:', error.message);
      }
    } else {
      console.log('Serper API key not configured');
    }
    
    // STEP 6: Fetch from RSS Feeds (if any exist)
    const rssFeeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 100);
    const activeFeeds = rssFeeds.filter(f => f.status === 'active');
    
    if (activeFeeds.length > 0) {
      console.log(`--- Fetching from ${activeFeeds.length} RSS feeds ---`);
      results.rss.attempted = true;
      try {
        let rssJobsTotal = 0;
        for (const feed of activeFeeds) {
          try {
            console.log(`Fetching: ${feed.feed_name} (${feed.feed_url})`);
            const response = await fetch(feed.feed_url, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (compatible; ReqRadar/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
              }
            });
            
            if (response.ok) {
              const contentType = response.headers.get('content-type') || '';
              console.log(`Response content-type: ${contentType}`);
              
              const feedContent = await response.text();
              console.log(`Received ${feedContent.length} characters`);
              
              // Check if it's actually XML/RSS
              if (!feedContent.includes('<rss') && !feedContent.includes('<feed')) {
                console.error(`Invalid RSS feed format for ${feed.feed_name}`);
                await base44.asServiceRole.entities.RSSFeed.update(feed.id, {
                  status: 'error',
                  last_updated: new Date().toISOString()
                });
                continue;
              }
              
              const jobs = parseRSSFeed(feedContent, feed.feed_name, targetRoles);
              console.log(`Parsed ${jobs.length} jobs from ${feed.feed_name}`);
              
              const newJobs = jobs.filter(j => !existingUrls.has(j.source_url));
              
              if (newJobs.length > 0) {
                await base44.asServiceRole.entities.OpenRole.bulkCreate(newJobs);
                rssJobsTotal += newJobs.length;
                console.log(`Created ${newJobs.length} new jobs from ${feed.feed_name}`);
              } else {
                console.log(`No new jobs from ${feed.feed_name} (all duplicates)`);
              }
              
              // Update feed stats
              await base44.asServiceRole.entities.RSSFeed.update(feed.id, {
                jobs_found: (feed.jobs_found || 0) + newJobs.length,
                last_updated: new Date().toISOString(),
                status: 'active'
              });
            } else {
              console.error(`HTTP ${response.status} for ${feed.feed_name}`);
              await base44.asServiceRole.entities.RSSFeed.update(feed.id, {
                status: 'error',
                last_updated: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error(`Error fetching ${feed.feed_name}:`, error.message);
            await base44.asServiceRole.entities.RSSFeed.update(feed.id, {
              status: 'error',
              last_updated: new Date().toISOString()
            });
          }
        }
        results.rss.found = rssJobsTotal;
        results.rss.created = rssJobsTotal;
        totalJobsCreated += rssJobsTotal;
      } catch (error) {
        results.rss.error = error.message;
        console.error('RSS feeds error:', error.message);
      }
    } else {
      console.log('No active RSS feeds configured');
    }
    
    // STEP 7: Count unique companies
    const allJobsNow = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    const uniqueCompanies = new Set(allJobsNow.map(j => j.company_name)).size;
    
    const duration = Date.now() - startTime;
    console.log(`=== DISCOVERY COMPLETE: ${totalJobsCreated} new jobs, ${(duration / 1000).toFixed(1)}s ===`);
    
    // Update discovery run record
    await base44.asServiceRole.entities.DiscoveryRun.update(runRecord.id, {
      status: 'completed',
      companies_found: uniqueCompanies,
      jobs_found: totalJobsCreated,
      duration_ms: duration
    });
    
    return Response.json({
      success: true,
      message: `Discovery complete: ${totalJobsCreated} new opportunities found`,
      jobs_created: totalJobsCreated,
      total_jobs: allJobsNow.length,
      companies: uniqueCompanies,
      duration_seconds: (duration / 1000).toFixed(1),
      details: results
    });
    
  } catch (error) {
    console.error('Discovery engine error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

// ========== HELPER FUNCTIONS ==========

async function fetchAdzunaJobs(targetRoles, apiKey) {
  const jobs = [];
  for (const role of targetRoles.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        app_id: 'reqradar',
        app_key: apiKey,
        results_per_page: '30',
        what: role,
        where: 'US',
        full_time: '1'
      });

      const response = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          jobs.push(...data.results.map(job => ({
            title: job.title.substring(0, 200),
            company_name: job.company.display_name.substring(0, 100),
            description: (job.description || '').substring(0, 1000),
            location: job.location?.display_name || 'US',
            work_type: 'Full-time',
            source: 'Adzuna',
            source_type: 'api',
            source_url: job.redirect_url,
            posted_date: new Date(job.created).toISOString().split('T')[0],
            status: 'new',
            match_score: 0
          })));
        }
      }
    } catch (error) {
      console.error(`Adzuna error for "${role}":`, error.message);
    }
  }
  return jobs;
}

async function fetchSerpAPIJobs(targetRoles, apiKey) {
  const jobs = [];
  for (const role of targetRoles.slice(0, 3)) {
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
        if (data.jobs_results) {
          jobs.push(...data.jobs_results.map(job => ({
            title: job.title.substring(0, 200),
            company_name: job.company_name.substring(0, 100),
            description: (job.description || '').substring(0, 1000),
            location: job.location || 'United States',
            work_type: job.employment_type || 'Full-time',
            source: 'SerpAPI (Google Jobs)',
            source_type: 'api',
            source_url: job.apply_link || job.link,
            posted_date: new Date().toISOString().split('T')[0],
            status: 'new',
            match_score: 0
          })));
        }
      }
    } catch (error) {
      console.error(`SerpAPI error for "${role}":`, error.message);
    }
  }
  return jobs;
}

async function fetchSerperJobs(targetRoles, apiKey) {
  const jobs = [];
  for (const role of targetRoles.slice(0, 3)) {
    try {
      const response = await fetch('https://google.serper.dev/jobs', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: role,
          location: 'United States',
          num: 30
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobs) {
          jobs.push(...data.jobs.map(job => ({
            title: job.title.substring(0, 200),
            company_name: job.company.substring(0, 100),
            description: (job.description || '').substring(0, 1000),
            location: job.location || 'United States',
            work_type: job.employmentType || 'Full-time',
            source: 'Serper (Google Jobs)',
            source_type: 'api',
            source_url: job.link,
            posted_date: job.date ? new Date(job.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: 'new',
            match_score: 0
          })));
        }
      }
    } catch (error) {
      console.error(`Serper error for "${role}":`, error.message);
    }
  }
  return jobs;
}

function parseRSSFeed(xml, feedName, targetRoles) {
  console.log(`Parsing RSS feed: ${feedName}`);
  const jobs = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  const roleKeywords = new Set();
  targetRoles.forEach(role => {
    role.toLowerCase().split(' ').forEach(word => {
      if (word.length > 2) roleKeywords.add(word);
    });
  });
  
  console.log(`Target role keywords: ${Array.from(roleKeywords).join(', ')}`);
  
  let itemCount = 0;
  while ((match = itemRegex.exec(xml)) !== null) {
    itemCount++;
    const itemContent = match[1];
    const title = extractXMLValue(itemContent, 'title');
    const description = extractXMLValue(itemContent, 'description');
    const link = extractXMLValue(itemContent, 'link');
    const pubDate = extractXMLValue(itemContent, 'pubDate');
    
    if (!title || !link) continue;
    
    // Filter by target roles
    const titleDesc = (title + ' ' + description).toLowerCase();
    const matches = Array.from(roleKeywords).some(keyword => titleDesc.includes(keyword));
    
    if (matches) {
      jobs.push({
        title: title.substring(0, 200),
        company_name: extractCompanyName(title, feedName),
        description: description ? description.substring(0, 1000) : '',
        location: 'Remote',
        work_type: 'Remote',
        source: feedName,
        source_type: 'rss_feed',
        source_url: link,
        posted_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: 'new',
        match_score: 0
      });
    }
  }
  
  console.log(`Parsed ${itemCount} RSS items, ${jobs.length} matched target roles`);
  return jobs;
}

function extractXMLValue(content, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = content.match(regex);
  if (match && match[1]) {
    return match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
  }
  return '';
}

function extractCompanyName(title, feedName) {
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return parts[parts.length - 1].trim().substring(0, 100);
  }
  return feedName.substring(0, 100);
}