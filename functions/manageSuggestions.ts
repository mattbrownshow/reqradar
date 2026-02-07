import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, suggestion_id, company_data } = await req.json();

        if (action === 'add_to_target') {
            // Get the suggestion
            const suggestions = await base44.entities.SuggestedCompany.filter({ 
                id: suggestion_id,
                created_by: user.email 
            });
            const suggestion = suggestions[0];

            if (!suggestion) {
                return Response.json({ error: 'Suggestion not found' }, { status: 404 });
            }

            // Check if company already exists
            const existingCompanies = await base44.entities.Company.filter({ 
                domain: suggestion.company_domain 
            });
            let company = existingCompanies[0];

            // Create company if doesn't exist
            if (!company) {
                const companyData = suggestion.company_data;
                company = await base44.entities.Company.create({
                    name: companyData.name,
                    domain: companyData.domain,
                    industry: companyData.industry,
                    employee_count: companyData.employee_count,
                    location: companyData.location,
                    description: companyData.description,
                    funding_stage: companyData.funding_stage,
                    match_score: suggestion.match_score,
                    tracked: true
                });
            } else {
                // Update to tracked
                await base44.entities.Company.update(company.id, { tracked: true });
            }

            // Update suggestion status
            await base44.entities.SuggestedCompany.update(suggestion_id, {
                status: 'added_to_target',
                reviewed_at: new Date().toISOString()
            });

            // Log activity
            await base44.entities.ActivityLog.create({
                type: 'company_added',
                title: 'Company Added from Suggestions',
                description: `Added ${company.name} to target list`,
                company_name: company.name,
                entity_id: company.id
            });

            // Trigger background enrichment
            try {
                base44.functions.invoke('enrichContact', {
                    company_domain: company.domain,
                    company_name: company.name,
                    job_titles: ['CFO', 'CEO', 'CTO']
                }).catch(err => console.error('Enrichment failed:', err));

                base44.functions.invoke('scanCareerPage', {
                    company_domain: company.domain,
                    company_name: company.name
                }).catch(err => console.error('Scan failed:', err));
            } catch (error) {
                console.error('Background tasks failed:', error);
            }

            return Response.json({ 
                success: true, 
                company: company 
            });

        } else if (action === 'dismiss') {
            await base44.entities.SuggestedCompany.update(suggestion_id, {
                status: 'dismissed',
                reviewed_at: new Date().toISOString()
            });

            return Response.json({ success: true });

        } else {
            return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Suggestions error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});