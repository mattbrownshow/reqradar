import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const startTime = Date.now();

        // Create discovery run record
        const run = await base44.entities.DiscoveryRun.create({
            run_at: new Date().toISOString(),
            status: 'running',
            created_by: user.email
        });

        try {
            // Get user preferences
            const profiles = await base44.entities.CandidateProfile.filter({ 
                created_by: user.email 
            });
            const profile = profiles[0];

            if (!profile || !profile.target_roles || profile.target_roles.length === 0) {
                throw new Error('User preferences not set');
            }

            // Get existing target companies to avoid duplicates
            const existingCompanies = await base44.entities.Company.filter({
                tracked: true,
                created_by: user.email
            });
            const existingDomains = existingCompanies.map(c => c.domain).filter(Boolean);

            // Search for new companies using discovery function
            const { data: discoveryResult } = await base44.functions.invoke('discoverCompanies', {
                industries: profile.industries || [],
                company_sizes: profile.company_sizes || [],
                locations: profile.preferred_locations || [],
                keywords: profile.target_roles?.[0] || '',
                limit: 20
            });

            const newCompanies = discoveryResult.companies.filter(c => 
                !existingDomains.includes(c.domain)
            );

            let jobsFound = 0;
            let pagesScanned = 0;

            // Process each new company
            for (const company of newCompanies) {
                let jobs = [];
                
                // Scan career page for high-match companies (score >= 80)
                if (company.match_score >= 80) {
                    try {
                        const { data: scanResult } = await base44.functions.invoke('scanCareerPage', {
                            company_domain: company.domain,
                            company_name: company.name
                        });
                        
                        if (scanResult.success && scanResult.jobs) {
                            jobs = scanResult.jobs;
                            pagesScanned++;
                        }
                    } catch (error) {
                        console.error(`Career scan failed for ${company.name}:`, error);
                    }
                }

                // Save as suggested company
                await base44.asServiceRole.entities.SuggestedCompany.create({
                    company_data: company,
                    company_name: company.name,
                    company_domain: company.domain,
                    match_score: company.match_score,
                    match_reasons: company.match_reasons || [],
                    jobs_found: jobs.length,
                    jobs_data: jobs,
                    status: 'new',
                    suggested_at: new Date().toISOString(),
                    created_by: user.email
                });

                jobsFound += jobs.length;
            }

            // Update discovery run
            const duration = Date.now() - startTime;
            await base44.asServiceRole.entities.DiscoveryRun.update(run.id, {
                status: 'completed',
                companies_found: newCompanies.length,
                jobs_found: jobsFound,
                career_pages_scanned: pagesScanned,
                duration_ms: duration
            });

            // Send email notification if companies found
            if (newCompanies.length > 0) {
                const topMatches = newCompanies.slice(0, 5);
                
                const emailHTML = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <div style="background: #F7931E; padding: 20px; color: white;">
                            <h1 style="margin: 0;">Flowzyn Daily Recommendations</h1>
                        </div>
                        <div style="padding: 20px;">
                            <h2>Good morning, ${user.full_name}!</h2>
                            <p>We found <strong>${newCompanies.length} new companies</strong> and <strong>${jobsFound} jobs</strong> matching your executive profile.</p>
                            <h3>Top Matches:</h3>
                            ${topMatches.map(company => `
                                <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                                    <h4 style="margin: 0 0 10px 0;">${company.name}</h4>
                                    <p style="color: #666; margin: 5px 0;">${company.industry || 'N/A'} | ${company.location || 'N/A'}</p>
                                    <p style="margin: 10px 0;">
                                        <span style="background: #FFF5E6; color: #F7931E; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                                            ${company.match_score}% Match
                                        </span>
                                    </p>
                                </div>
                            `).join('')}
                            <p style="text-align: center; margin-top: 30px;">
                                <a href="${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}" 
                                   style="background: #F7931E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                    Review Recommendations
                                </a>
                            </p>
                        </div>
                    </div>
                `;

                await base44.integrations.Core.SendEmail({
                    from_name: 'Flowzyn',
                    to: user.email,
                    subject: `${newCompanies.length} new companies matching your profile`,
                    body: emailHTML
                });
            }

            return Response.json({
                success: true,
                companies_found: newCompanies.length,
                jobs_found: jobsFound,
                career_pages_scanned: pagesScanned,
                duration_ms: Date.now() - startTime
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            await base44.asServiceRole.entities.DiscoveryRun.update(run.id, {
                status: 'failed',
                error_message: error.message,
                duration_ms: duration
            });
            throw error;
        }

    } catch (error) {
        console.error('Discovery error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});