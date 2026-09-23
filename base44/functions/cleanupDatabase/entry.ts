import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Starting database cleanup...');
    
    // Delete all existing RSS feeds
    const feeds = await base44.asServiceRole.entities.RSSFeed.list('-created_date', 1000);
    console.log(`Found ${feeds.length} RSS feeds to delete`);
    
    for (const feed of feeds) {
      await base44.asServiceRole.entities.RSSFeed.delete(feed.id);
    }
    console.log('✓ Deleted all RSS feeds');
    
    // Delete all existing jobs
    const jobs = await base44.asServiceRole.entities.OpenRole.list('-created_date', 1000);
    console.log(`Found ${jobs.length} jobs to delete`);
    
    for (const job of jobs) {
      await base44.asServiceRole.entities.OpenRole.delete(job.id);
    }
    console.log('✓ Deleted all jobs');
    
    // Delete all discovery runs
    const runs = await base44.asServiceRole.entities.DiscoveryRun.list('-run_at', 1000);
    console.log(`Found ${runs.length} discovery runs to delete`);
    
    for (const run of runs) {
      await base44.asServiceRole.entities.DiscoveryRun.delete(run.id);
    }
    console.log('✓ Deleted all discovery runs');
    
    return Response.json({
      success: true,
      message: 'Database cleaned successfully',
      deleted: {
        feeds: feeds.length,
        jobs: jobs.length,
        runs: runs.length
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});