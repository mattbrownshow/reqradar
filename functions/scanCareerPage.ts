import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import puppeteer from 'npm:puppeteer@23.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, companyWebsite, companyName } = await req.json();
    
    if (!companyWebsite || !companyId) {
      return Response.json({ error: 'Company website and ID required' }, { status: 400 });
    }

    // Get user preferences for filtering
    const profiles = await base44.entities.CandidateProfile.filter({
      email: user.email
    });
    const userPrefs = profiles[0];

    if (!userPrefs || !userPrefs.target_roles || userPrefs.target_roles.length === 0) {
      return Response.json({
        success: false,
        error: 'No target roles set in profile. Please configure your job preferences first.'
      }, { status: 400 });
    }

    console.log('Starting career page scan for:', companyWebsite);

    // Scrape jobs
    const jobs = await scrapeCareerPage(companyWebsite);

    if (jobs.length === 0) {
      return Response.json({
        success: true,
        message: 'No jobs found on career page',
        jobsFound: 0,
        jobsAdded: 0
      });
    }

    // Filter by target roles
    const relevantJobs = jobs.filter(job => 
      userPrefs.target_roles.some(role => 
        job.title.toLowerCase().includes(role.toLowerCase()) ||
        role.toLowerCase().includes(job.title.toLowerCase())
      )
    );

    // Check for duplicates and save
    let addedCount = 0;
    for (const job of relevantJobs) {
      const existing = await base44.entities.OpenRole.filter({
        company_id: companyId,
        title: job.title
      });

      if (existing.length === 0) {
        await base44.entities.OpenRole.create({
          company_id: companyId,
          company_name: companyName || job.company,
          title: job.title,
          location: job.location,
          description: job.description,
          source_type: 'career_page',
          source: 'Career Page',
          source_url: job.url,
          posted_date: new Date().toISOString().split('T')[0],
          status: 'new',
          match_score: 75
        });
        addedCount++;
      }
    }

    // Update company last_scanned if it has that field
    const companies = await base44.entities.Company.filter({ id: companyId });
    if (companies.length > 0) {
      await base44.entities.Company.update(companyId, {
        ...companies[0],
        notes: `Last scanned: ${new Date().toLocaleDateString()}`
      });
    }

    return Response.json({
      success: true,
      message: `Found ${jobs.length} jobs, added ${addedCount} matching roles`,
      jobsFound: jobs.length,
      relevantJobs: relevantJobs.length,
      jobsAdded: addedCount,
      targetRoles: userPrefs.target_roles
    });

  } catch (error) {
    console.error('Error scanning career page:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function scrapeCareerPage(websiteUrl) {
  let browser;
  try {
    // Normalize URL
    let careerUrl = websiteUrl;
    if (!careerUrl.startsWith('http')) {
      careerUrl = `https://${careerUrl}`;
    }

    // Try common career page paths
    const careerPaths = [
      '/careers',
      '/jobs',
      '/careers/jobs',
      '/about/careers',
      '/company/careers',
      '/work-with-us'
    ];

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    let jobs = [];
    let foundCareerPage = false;

    // Try each career path
    for (const path of careerPaths) {
      try {
        const url = new URL(careerUrl);
        const testUrl = `${url.origin}${path}`;
        
        console.log('Trying:', testUrl);
        await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 10000 });

        // Check if page loaded successfully
        const content = await page.content();
        if (content.length > 1000) {
          // Detect ATS type
          if (content.includes('greenhouse') || testUrl.includes('greenhouse')) {
            jobs = await scrapeGreenhouse(page, testUrl);
            foundCareerPage = true;
            break;
          } else if (content.includes('lever') || testUrl.includes('lever')) {
            jobs = await scrapeLever(page, testUrl);
            foundCareerPage = true;
            break;
          } else if (content.includes('job') || content.includes('position') || content.includes('career')) {
            jobs = await scrapeGeneric(page, testUrl);
            foundCareerPage = true;
            break;
          }
        }
      } catch (err) {
        console.log(`Failed to load ${path}:`, err.message);
        continue;
      }
    }

    if (!foundCareerPage) {
      // Try base domain as last resort
      console.log('Trying base domain:', careerUrl);
      await page.goto(careerUrl, { waitUntil: 'networkidle2', timeout: 10000 });
      jobs = await scrapeGeneric(page, careerUrl);
    }

    await browser.close();
    return jobs;

  } catch (error) {
    if (browser) await browser.close();
    console.error('Scraping error:', error);
    return [];
  }
}

async function scrapeGreenhouse(page, baseUrl) {
  try {
    await page.waitForSelector('.opening', { timeout: 5000 });
    
    const jobs = await page.evaluate((url) => {
      const jobElements = document.querySelectorAll('.opening');
      return Array.from(jobElements).map(el => {
        const titleEl = el.querySelector('a');
        const locationEl = el.querySelector('.location');
        
        return {
          title: titleEl?.textContent?.trim() || 'Position Available',
          location: locationEl?.textContent?.trim() || 'Location TBD',
          url: titleEl?.href || url,
          description: ''
        };
      });
    }, baseUrl);

    return jobs;
  } catch (err) {
    console.log('Greenhouse scraping failed:', err.message);
    return [];
  }
}

async function scrapeLever(page, baseUrl) {
  try {
    await page.waitForSelector('.posting', { timeout: 5000 });
    
    const jobs = await page.evaluate((url) => {
      const jobElements = document.querySelectorAll('.posting');
      return Array.from(jobElements).map(el => {
        const titleEl = el.querySelector('.posting-title h5');
        const locationEl = el.querySelector('.posting-categories .location');
        const linkEl = el.querySelector('a.posting-btn-submit');
        
        return {
          title: titleEl?.textContent?.trim() || 'Position Available',
          location: locationEl?.textContent?.trim() || 'Location TBD',
          url: linkEl?.href || url,
          description: ''
        };
      });
    }, baseUrl);

    return jobs;
  } catch (err) {
    console.log('Lever scraping failed:', err.message);
    return [];
  }
}

async function scrapeGeneric(page, baseUrl) {
  try {
    const jobs = await page.evaluate((url) => {
      const results = [];
      
      // Look for common job listing patterns
      const selectors = [
        'a[href*="job"]',
        'a[href*="position"]',
        'a[href*="career"]',
        'a[href*="opening"]',
        '.job',
        '.position',
        '.career',
        '[class*="job-"]',
        '[class*="position-"]'
      ];

      const foundLinks = new Set();
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          const href = el.getAttribute('href');
          
          // Filter out navigation links and look for actual job titles
          if (text && text.length > 10 && text.length < 200 && 
              !text.toLowerCase().includes('navigation') &&
              !text.toLowerCase().includes('menu') &&
              !foundLinks.has(text)) {
            
            foundLinks.add(text);
            
            // Try to extract location
            let location = 'Location TBD';
            const parent = el.closest('div, li, article');
            if (parent) {
              const locationMatch = parent.textContent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b/);
              if (locationMatch) {
                location = locationMatch[1];
              }
            }
            
            results.push({
              title: text,
              location: location,
              url: href?.startsWith('http') ? href : new URL(href || '', url).href,
              description: ''
            });
          }
        });
        
        if (results.length > 0) break;
      }

      return results.slice(0, 20); // Limit to 20 jobs
    }, baseUrl);

    return jobs;
  } catch (err) {
    console.log('Generic scraping failed:', err.message);
    return [];
  }
}