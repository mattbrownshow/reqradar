import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    if (!data) {
      return Response.json({ error: 'No data provided' }, { status: 400 });
    }

    // Get the outreach message
    const message = data;
    if (!message.company_name) {
      return Response.json({ error: 'No company_name in message' }, { status: 400 });
    }

    // Find related job pipeline items for this company
    const pipelines = await base44.asServiceRole.entities.JobPipeline.filter({});
    
    let updated = 0;

    for (const pipeline of pipelines) {
      if (!pipeline.job_id) continue;
      
      const job = await base44.asServiceRole.entities.OpenRole.list({ id: pipeline.job_id });
      if (!job || job.length === 0) continue;
      
      const currentJob = job[0];
      if (currentJob.company_name !== message.company_name) continue;

      let targetStage = pipeline.stage;

      // Auto-transition logic
      if (event.type === 'create' && message.status === 'sent') {
        // Message sent → Outreach Active
        if (pipeline.stage === 'intel_gathering') {
          targetStage = 'outreach_active';
        }
      } else if (event.type === 'update' && message.status === 'responded') {
        // Reply received → Conversation
        if (pipeline.stage === 'outreach_active') {
          targetStage = 'conversation';
        }
      }

      // Update if stage changed
      if (targetStage !== pipeline.stage) {
        await base44.asServiceRole.entities.JobPipeline.update(pipeline.id, {
          stage: targetStage
        });
        updated++;
      }
    }

    return Response.json({
      status: 'success',
      pipelines_updated: updated,
      event_type: event.type,
      message_status: message.status
    });
  } catch (error) {
    console.error('Stage update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});