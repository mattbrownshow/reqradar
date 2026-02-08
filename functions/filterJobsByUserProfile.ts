import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profiles = await base44.entities.CandidateProfile.filter({ 
      created_by: user.email 
    });
    const userProfile = profiles[0];
    
    if (!userProfile || !userProfile.target_roles || userProfile.target_roles.length === 0) {
      return Response.json({ 
        success: false,
        error: 'User profile not configured',
        jobs: []
      });
    }

    // Get all open roles
    const allRoles = await base44.entities.OpenRole.list("-created_date", 500);
    
    // Filter and score each job
    const scoredJobs = allRoles
      .map(job => ({
        ...job,
        match_score: calculateMatchScore(job, userProfile)
      }))
      .filter(job => job.match_score >= 50)
      .sort((a, b) => b.match_score - a.match_score);

    // Categorize by match level
    const highMatch = scoredJobs.filter(j => j.match_score >= 88);
    const mediumMatch = scoredJobs.filter(j => j.match_score >= 70 && j.match_score < 88);
    const lowMatch = scoredJobs.filter(j => j.match_score >= 50 && j.match_score < 70);

    return Response.json({
      success: true,
      total: scoredJobs.length,
      highMatch: highMatch.length,
      mediumMatch: mediumMatch.length,
      lowMatch: lowMatch.length,
      jobs: scoredJobs.slice(0, 200),
      categorized: {
        highMatch,
        mediumMatch,
        lowMatch,
        all: scoredJobs
      }
    });

  } catch (error) {
    console.error('Filter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildRoleKeywords(targetRoles) {
  const keywords = [];
  for (const role of (targetRoles || [])) {
    const normalized = role.toLowerCase().trim();
    keywords.push(normalized);
    if (normalized.includes('ux') || normalized.includes('designer')) {
      keywords.push('user experience', 'ui designer', 'product designer', 'senior ux', 'lead ux', 'principal ux');
    }
    if (normalized.includes('head') || normalized.includes('director')) {
      keywords.push('director', 'head of');
    }
  }
  return keywords;
}

function matchesRole(jobTitle, targetRoles) {
  if (!jobTitle) return false;
  const normalizedJob = jobTitle.toLowerCase();
  const keywords = buildRoleKeywords(targetRoles);
  return keywords.some(k => normalizedJob.includes(k));
}

function matchesIndustry(jobIndustry, preferredIndustries) {
  if (!jobIndustry || !preferredIndustries || preferredIndustries.length === 0) return true;
  const normalizedJob = jobIndustry.toLowerCase();
  return preferredIndustries.some(pref => {
    const normalized = pref.toLowerCase();
    return normalizedJob.includes(normalized.split(' / ')[0]) || 
           normalizedJob.includes(normalized.split(' ')[0]);
  });
}

function matchesLocation(jobLocation, preferredLocations, isRemote, acceptRemote) {
  if (isRemote && acceptRemote) return true;
  if (!jobLocation || !preferredLocations || preferredLocations.length === 0) return true;
  const normalizedJob = jobLocation.toLowerCase();
  return preferredLocations.some(loc => {
    const normalized = loc.toLowerCase();
    return normalizedJob.includes(normalized.split(',')[0]) || 
           normalizedJob.includes(normalized.split(',')[1]?.trim());
  });
}

function calculateMatchScore(job, userProfile) {
  // CRITICAL: All three criteria must match or score is 0
  if (!matchesRole(job.title, userProfile.target_roles)) return 0;
  if (!matchesIndustry(job.industry, userProfile.industries)) return 0;
  
  const acceptRemote = userProfile.remote_preferences && 
    userProfile.remote_preferences.some(p => p.toLowerCase().includes('remote'));
  
  if (!matchesLocation(job.location, userProfile.preferred_locations, job.remote, acceptRemote)) return 0;
  
  // Score based on match quality
  let score = 50; // Base score for matching all criteria
  
  // Role exact match bonus
  if (userProfile.target_roles.some(r => job.title.toLowerCase().includes(r.toLowerCase()))) {
    score += 20;
  }
  
  // Location exact match bonus
  if (userProfile.preferred_locations && userProfile.preferred_locations.length > 0) {
    if (userProfile.preferred_locations.some(loc => job.location?.toLowerCase().includes(loc.toLowerCase()))) {
      score += 15;
    }
  }
  
  // Remote bonus
  if (job.remote && acceptRemote) {
    score += 10;
  }
  
  return Math.min(score, 100);
}