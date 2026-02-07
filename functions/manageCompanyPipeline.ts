import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, company_id, pipeline_id, stage, priority, notes, contact_person } = await req.json();

        if (action === 'add') {
            // Check if already in pipeline
            const existing = await base44.entities.CompanyPipeline.filter({ 
                company_id: company_id,
                created_by: user.email 
            });

            if (existing.length > 0) {
                return Response.json({ 
                    error: 'Company already in pipeline',
                    pipeline_item: existing[0]
                }, { status: 400 });
            }

            // Create pipeline item
            const pipelineItem = await base44.entities.CompanyPipeline.create({
                company_id: company_id,
                stage: 'researching',
                priority: priority || 'medium'
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
            if (stage === 'contacted') {
                updates.contacted_at = new Date().toISOString();
                updates.last_interaction = new Date().toISOString();
            }

            await base44.entities.CompanyPipeline.update(pipeline_id, updates);

            return Response.json({ success: true });

        } else if (action === 'update') {
            const updates = {};
            
            if (priority) updates.priority = priority;
            if (notes !== undefined) updates.notes = notes;
            if (contact_person) updates.contact_person = contact_person;
            
            updates.updated_date = new Date().toISOString();
            updates.last_interaction = new Date().toISOString();

            await base44.entities.CompanyPipeline.update(pipeline_id, updates);

            return Response.json({ success: true });

        } else if (action === 'delete') {
            await base44.entities.CompanyPipeline.delete(pipeline_id);
            return Response.json({ success: true });

        } else {
            return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Company pipeline error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});