import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Build role keywords for matching
function buildRoleKeywords(targetRoles) {
  const keywords = [];
  
  for (const role of (targetRoles || [])) {
    const normalized = role.toLowerCase().trim();
    keywords.push(normalized);
    
    if (normalized.includes('ux') || normalized.includes('designer')) {
      keywords.push('user experience', 'ui designer', 'product designer', 'senior ux', 'lead ux', 'principal ux', 'staff ux', 'head of design');
    }
    
    if (normalized.includes('head') || normalized.includes('director') || normalized.includes('vp')) {
      keywords.push('director', 'vice president', 'vp', 'head of');
    }
  }
  
  return keywords;
}

// Check if job title matches target roles
function matchesRole(jobTitle, targetRoles) {
  if (!jobTitle) return { matches: false, score: 0 };
  
  const normalizedJob = jobTitle.toLowerCase();
  const roleKeywords = buildRoleKeywords(targetRoles);
  
  // Check for exact or substring match
  for (const keyword of roleKeywords) {
    if (normalizedJob.includes(keyword)) {
      // Exact match gets higher score
      const isExact = targetRoles.some(tr => normalizedJob === tr.toLowerCase());
      return { matches: true, score: isExact ? 40 : 30 };
    }
  }
  
  return { matches: false, score: 0 };
}

// Check if industry matches
function matchesIndustry(jobIndustry, preferredIndustries) {
  if (!jobIndustry || !preferredIndustries || preferredIndustries.length === 0) {
    return { matches: false, score: 0 };
  }
  
  const normalizedJob = jobIndustry.toLowerCase();
  
  for (const preferred of preferredIndustries) {
    const normalizedPreferred = preferred.toLowerCase();
    
    if (normalizedJob.includes(normalizedPreferred.split(' / ')[0]) || 
        normalizedPreferred.includes(normalizedJob)) {
      return { matches: true, score: 30 };
    }
    
    // Check related industries
    const saasTerms = ['saas', 'software', 'technology', 'tech', 'cloud'];
    const mediaTerms = ['media', 'entertainment', 'streaming', 'publishing', 'gaming'];
    const teleTerms = ['telecom', 'telecommunications', 'wireless', 'mobile'];
    
    if ((preferred.includes('Technology') || preferred.includes('SaaS')) && saasTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 25 };
    }
    if ((preferred.includes('Media') || preferred.includes('Entertainment')) && mediaTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 25 };
    }
    if (preferred.includes('Telecommunications') && teleTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 25 };
    }
  }
  
  return { matches: false, score: 0 };
}

// Check if location matches
function matchesLocation(jobLocation, preferredLocations, isRemote, userRemotePreference) {
  if (!jobLocation && !isRemote) {
    return { matches: false, score: 0 };
  }
  
  // Remote jobs match if user accepts remote
  if (isRemote && userRemotePreference) {
    return { matches: true, score: 20 };
  }
  
  if (!jobLocation) {
    return { matches: false, score: 0 };
  }
  
  const normalizedJob = jobLocation.toLowerCase();
  
  for (const userLoc of (preferredLocations || [])) {
    const normalizedUser = userLoc.toLowerCase();
    
    // Exact city match
    if (normalizedJob.includes(normalizedUser) || normalizedUser.includes(normalizedJob)) {
      return { matches: true, score: 20 };
    }
    
    // State match
    const jobState = normalizedJob.split(',').pop()?.trim();
    const userState = normalizedUser.split(',').pop()?.trim();
    if (jobState && userState && jobState === userState) {
      return { matches: true, score: 15 };
    }
  }
  
  return { matches: false, score: 0 };
}

// Calculate match score
function calculateMatchScore(job, userProfile) {
  if (!userProfile || !userProfile.target_roles || userProfile.target_roles.length === 0) {
    return 0;
  }
  
  // Role match is required
  const roleMatch = matchesRole(job.title, userProfile.target_roles);
  if (!roleMatch.matches) {
    return 0;
  }
  
  // Industry match is required (if industries are specified)
  let industryScore = 0;
  if (userProfile.industries && userProfile.industries.length > 0) {
    const industryMatch = matchesIndustry(job.industry, userProfile.industries);
    if (!industryMatch.matches) {
      return 0;
    }
    industryScore = industryMatch.score;
  }
  
  // Location match is required (or remote OK)
  const locationMatch = matchesLocation(job.location, userProfile.preferred_locations, job.remote, userProfile.remote_preferences && userProfile.remote_preferences.includes('Fully Remote'));
  if (!locationMatch.matches) {
    return 0;
  }
  
  // Only jobs matching ALL criteria get scored
  const totalScore = roleMatch.score + industryScore + locationMatch.score + 10;
  return Math.min(totalScore, 100);
}

Deno.serve(async (req) => {
  try {
    const { job, userProfile } = await req.json();
    
    const score = calculateMatchScore(job, userProfile);
    
    return Response.json({
      match_score: score,
      matches: score >= 50
    });
  } catch (error) {
    console.error('Match score calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});