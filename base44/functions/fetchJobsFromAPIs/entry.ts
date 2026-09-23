import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fetch jobs from public APIs: Remotive, Arbeitnow, The Muse
// Based on user's target roles and locations

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
    
    if (!profile) {
      return Response.json({ error: 'No profile found' }, { status: 400 });
    }
    
    const targetRoles = profile.target_roles || [];
    const locations = profile.preferred_locations || [];
    
    let jobsCreated = 0;
    const errors = [];
    
    // 1. Fetch from Remotive (Remote Jobs API)
    try {
      const remitiveUrl = new URL('https://remotive.com/api/remote-jobs');
      remitiveUrl.searchParams.set('limit', '50');
      
      const remitiveRes = await fetch(remitiveUrl);
      if (remitiveRes.ok) {
        const data = await remitiveRes.json();
        const jobs = data.jobs || [];
        
        for (const job of jobs) {
          // Check if role matches user preferences
          const roleMatch = targetRoles.some(role => 
            job.title.toLowerCase().includes(role.toLowerCase()) ||
            job.title.toLowerCase().includes(role.toLowerCase().split('(')[0].trim())
          );
          
          if (roleMatch) {
            try {
              await base44.entities.OpenRole.create({
                company_name: job.company_name || 'Unknown',
                title: job.title,
                description: job.description || '',
                location: 'Remote',
                work_type: 'Remote',
                source: 'Remotive',
                source_type: 'rss_feed',
                source_url: job.url,
                posted_date: job.published_at?.split('T')[0],
                status: 'new'
              });
              jobsCreated++;
            } catch (e) {
              console.error('Error creating OpenRole from Remotive:', e);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Remotive fetch failed: ${error.message}`);
    }
    
    // 2. Fetch from Arbeitnow
    try {
      const arbeitnowUrl = new URL('https://www.arbeitnow.com/api/job-board-api');
      
      const arbeitRes = await fetch(arbeitnowUrl);
      if (arbeitRes.ok) {
        const data = await arbeitRes.json();
        const jobs = data.data || [];
        
        for (const job of jobs) {
          const roleMatch = targetRoles.some(role => 
            job.title.toLowerCase().includes(role.toLowerCase()) ||
            job.title.toLowerCase().includes(role.toLowerCase().split('(')[0].trim())
          );
          
          if (roleMatch) {
            try {
              await base44.entities.OpenRole.create({
                company_name: job.company_name || 'Unknown',
                title: job.title,
                description: job.description || '',
                location: job.location || 'Not specified',
                work_type: job.job_type || 'Not specified',
                source: 'Arbeitnow',
                source_type: 'rss_feed',
                source_url: job.url,
                posted_date: job.posted_at?.split('T')[0],
                status: 'new'
              });
              jobsCreated++;
            } catch (e) {
              console.error('Error creating OpenRole from Arbeitnow:', e);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Arbeitnow fetch failed: ${error.message}`);
    }
    
    // 3. Fetch from The Muse
    try {
      const museUrl = new URL('https://www.themuse.com/developers/api/v2/jobs');
      museUrl.searchParams.set('page', '0');
      museUrl.searchParams.set('bot', 'false');
      
      const museRes = await fetch(museUrl);
      if (museRes.ok) {
        const data = await museRes.json();
        const jobs = data.results || [];
        
        for (const job of jobs) {
          const roleMatch = targetRoles.some(role => 
            job.name.toLowerCase().includes(role.toLowerCase()) ||
            job.name.toLowerCase().includes(role.toLowerCase().split('(')[0].trim())
          );
          
          if (roleMatch) {
            try {
              const locations = job.locations?.map(l => l.name).join(', ') || 'Not specified';
              
              await base44.entities.OpenRole.create({
                company_name: job.company?.name || 'Unknown',
                title: job.name,
                description: job.short_description || '',
                location: locations,
                work_type: 'Not specified',
                source: 'The Muse',
                source_type: 'rss_feed',
                source_url: job.refs?.landing_page,
                posted_date: job.published_at?.split('T')[0],
                status: 'new'
              });
              jobsCreated++;
            } catch (e) {
              console.error('Error creating OpenRole from The Muse:', e);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`The Muse fetch failed: ${error.message}`);
    }
    
    return Response.json({
      success: true,
      jobs_created: jobsCreated,
      sources_checked: 3,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error fetching from job APIs:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});