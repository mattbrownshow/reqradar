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
  
  // First check for exact title match
  for (const targetRole of targetRoles) {
    const normalizedTarget = targetRole.toLowerCase().trim();
    
    // Exact match (e.g. "chief marketing officer (cmo)" matches "Chief Marketing Officer (CMO)")
    if (normalizedJob === normalizedTarget) {
      return { matches: true, score: 50 };
    }
    
    // Very close match - all words present in same order
    const targetWords = normalizedTarget.replace(/[()]/g, '').split(/\s+/);
    const jobWords = normalizedJob.replace(/[()]/g, '').split(/\s+/);
    
    if (targetWords.every(word => jobWords.includes(word))) {
      return { matches: true, score: 48 };
    }
  }
  
  // Then check keywords
  const roleKeywords = buildRoleKeywords(targetRoles);
  for (const keyword of roleKeywords) {
    if (normalizedJob.includes(keyword)) {
      return { matches: true, score: 35 };
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
      return { matches: true, score: 20 };
    }
    
    // Check related industries
    const saasTerms = ['saas', 'software', 'technology', 'tech', 'cloud'];
    const mediaTerms = ['media', 'entertainment', 'streaming', 'publishing', 'gaming'];
    const teleTerms = ['telecom', 'telecommunications', 'wireless', 'mobile'];
    
    if ((preferred.includes('Technology') || preferred.includes('SaaS')) && saasTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 18 };
    }
    if ((preferred.includes('Media') || preferred.includes('Entertainment')) && mediaTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 18 };
    }
    if (preferred.includes('Telecommunications') && teleTerms.some(t => normalizedJob.includes(t))) {
      return { matches: true, score: 18 };
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
    return { score: 0, matches: false, reasons: [] };
  }
  
  let totalScore = 0;
  const matchReasons = [];

  // Role match is REQUIRED - this is the only hard requirement
  const roleMatch = matchesRole(job.title, userProfile.target_roles);
  if (!roleMatch.matches) {
    return { score: 0, matches: false, reasons: [] };
  }
  
  // Role matched - start with base score
  totalScore += roleMatch.score;
  if (roleMatch.score === 50) matchReasons.push("Exact role match");
  else if (roleMatch.score === 48) matchReasons.push("Close role match");
  else matchReasons.push("Role keyword match");
  
  // Industry match is OPTIONAL - adds to score but not required
  if (userProfile.industries && userProfile.industries.length > 0) {
    const industryMatch = matchesIndustry(job.industry, userProfile.industries);
    if (industryMatch.matches) {
      totalScore += industryMatch.score;
      matchReasons.push("Industry match");
    }
  }

  // Location match is OPTIONAL - adds to score but not required
  const isRemotePreferred = userProfile.remote_preferences && userProfile.remote_preferences.includes('Fully Remote');
  const locationMatch = matchesLocation(job.location, userProfile.preferred_locations, job.remote, isRemotePreferred);
  if (locationMatch.matches) {
    totalScore += locationMatch.score;
    matchReasons.push("Location match");
  }

  // Ensure minimum score for any role match
  const finalScore = Math.max(totalScore + 10, 35); // Min 35% for role-only match
  
  return {
    score: Math.min(finalScore, 100),
    matches: true, // All role matches are considered matches
    reasons: matchReasons
  };
}

Deno.serve(async (req) => {
  try {
    const { job, userProfile } = await req.json();
    
    const result = calculateMatchScore(job, userProfile);
    
    return Response.json({
      match_score: result.score,
      matches: result.matches,
      match_reasons: result.reasons
    });
  } catch (error) {
    console.error('Match score calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});