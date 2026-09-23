import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting data reset for user:', user.email);

    // Delete in order to avoid foreign key conflicts
    // Start with dependent entities first
    const deleteOperations = [
      { name: 'ActivityLog', fn: () => base44.asServiceRole.entities.ActivityLog.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.ActivityLog.delete(i.id).catch(() => null)))) },
      { name: 'OutreachMessage', fn: () => base44.asServiceRole.entities.OutreachMessage.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.OutreachMessage.delete(i.id).catch(() => null)))) },
      { name: 'Application', fn: () => base44.asServiceRole.entities.Application.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.Application.delete(i.id).catch(() => null)))) },
      { name: 'JobPipeline', fn: () => base44.asServiceRole.entities.JobPipeline.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.JobPipeline.delete(i.id).catch(() => null)))) },
      { name: 'CompanyPipeline', fn: () => base44.asServiceRole.entities.CompanyPipeline.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.CompanyPipeline.delete(i.id).catch(() => null)))) },
      { name: 'SuggestedCompany', fn: () => base44.asServiceRole.entities.SuggestedCompany.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.SuggestedCompany.delete(i.id).catch(() => null)))) },
      { name: 'DiscoveryRun', fn: () => base44.asServiceRole.entities.DiscoveryRun.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.DiscoveryRun.delete(i.id).catch(() => null)))) },
      { name: 'RSSFeed', fn: () => base44.asServiceRole.entities.RSSFeed.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.RSSFeed.delete(i.id).catch(() => null)))) },
      { name: 'OpenRole', fn: () => base44.asServiceRole.entities.OpenRole.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.OpenRole.delete(i.id).catch(() => null)))) },
      { name: 'Company', fn: () => base44.asServiceRole.entities.Company.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.Company.delete(i.id).catch(() => null)))) },
      { name: 'CandidateProfile', fn: () => base44.asServiceRole.entities.CandidateProfile.list('-created_date', 500).then(items => Promise.all(items.map(i => base44.asServiceRole.entities.CandidateProfile.delete(i.id).catch(() => null)))) }
    ];

    // Execute deletions sequentially to handle dependencies
    for (const op of deleteOperations) {
      try {
        console.log(`Deleting ${op.name}...`);
        await op.fn();
        console.log(`Successfully deleted ${op.name}`);
      } catch (err) {
        console.error(`Error deleting ${op.name}:`, err.message);
        // Continue with next entity even if one fails
      }
    }

    console.log('Data reset completed successfully');

    return Response.json({
      success: true,
      message: 'All user data has been reset'
    });
  } catch (error) {
    console.error('Reset error:', error.message);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});