import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, job_id, pipeline_id, stage, priority, notes, interview_date, offer_amount } = await req.json();

        if (action === 'save') {
            // Check if already in pipeline
            const existing = await base44.entities.JobPipeline.filter({ 
                job_id: job_id,
                created_by: user.email 
            });

            if (existing.length > 0) {
                return Response.json({ 
                    error: 'Job already in pipeline',
                    pipeline_item: existing[0]
                }, { status: 400 });
            }

            // Get job details for company_id
            const jobs = await base44.entities.OpenRole.filter({ id: job_id });
            const job = jobs[0];

            if (!job) {
                return Response.json({ error: 'Job not found' }, { status: 404 });
            }

            // Create pipeline item
            const pipelineItem = await base44.entities.JobPipeline.create({
                job_id: job_id,
                company_id: job.company_id,
                stage: 'saved',
                priority: priority || 'medium',
                saved_at: new Date().toISOString()
            });

            return Response.json({ 
                success: true, 
                pipeline_item: pipelineItem 
            });

        } else if (action === 'move') {
            const updates = {
                stage: stage,
                updated_date: new Date().toISOString()
            };

            // Track stage-specific timestamps
            if (stage === 'applied') {
                updates.applied_at = new Date().toISOString();
            }

            await base44.entities.JobPipeline.update(pipeline_id, updates);

            return Response.json({ success: true });

        } else if (action === 'update') {
            const updates = {};
            
            if (priority) updates.priority = priority;
            if (notes !== undefined) updates.notes = notes;
            if (interview_date) updates.interview_date = interview_date;
            if (offer_amount) updates.offer_amount = offer_amount;
            
            updates.updated_date = new Date().toISOString();

            await base44.entities.JobPipeline.update(pipeline_id, updates);

            return Response.json({ success: true });

        } else if (action === 'delete') {
            await base44.entities.JobPipeline.delete(pipeline_id);
            return Response.json({ success: true });

        } else {
            return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Pipeline error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});