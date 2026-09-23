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

            let jobsFound = 0;
            let pagesScanned = 0;

            // Fetch jobs from RSS feeds only
            try {
              const { data: rssResult } = await base44.functions.invoke('fetchRSSFeeds', {});
              if (rssResult.success) {
                jobsFound += rssResult.jobs_created || 0;
              }
            } catch (error) {
              console.error('Failed to fetch from RSS feeds:', error);
            }

            // Update discovery run
            const duration = Date.now() - startTime;
            await base44.asServiceRole.entities.DiscoveryRun.update(run.id, {
                status: 'completed',
                companies_found: 0,
                jobs_found: jobsFound,
                career_pages_scanned: pagesScanned,
                duration_ms: duration
            });

            return Response.json({
                success: true,
                companies_found: 0,
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