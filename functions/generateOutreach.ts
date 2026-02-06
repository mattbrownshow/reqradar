import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generate AI-powered outreach message for a contact
// Input: { contactId, companyId, angle }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { contactId, companyId, angle } = await req.json();
    
    // Fetch contact and company data
    const contacts = await base44.entities.Contact.filter({ id: contactId });
    const companies = await base44.entities.Company.filter({ id: companyId });
    
    if (!contacts.length || !companies.length) {
      return Response.json({ error: 'Contact or company not found' }, { status: 404 });
    }
    
    const contact = contacts[0];
    const company = companies[0];
    
    // Generate outreach using AI
    const prompt = `You are an expert executive search consultant writing a personalized outreach email.

COMPANY: ${company.name}
INDUSTRY: ${company.industry || 'Technology'}
DECISION MAKER: ${contact.full_name} (${contact.title})

OUTREACH ANGLE: ${angle || 'Hiring Pain Point'}
${company.intelligence_signals ? 'INTELLIGENCE SIGNALS: ' + company.intelligence_signals.join(', ') : ''}

Write a compelling, personalized email with:
1. Subject line (under 60 characters)
2. Email body (150-200 words)
3. Consultative tone (not salesy)
4. Reference specific company details or pain points
5. Clear CTA (brief call to discuss)

DO NOT include recipient name, greeting, or signature - just the subject and body content.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        }
      }
    });
    
    // Create outreach message in "draft" status
    const message = await base44.entities.OutreachMessage.create({
      contact_id: contactId,
      contact_name: contact.full_name,
      contact_title: contact.title,
      company_id: companyId,
      company_name: company.name,
      subject: result.subject,
      body: result.body,
      channel: "email",
      status: "draft",
      template_type: angle || "Hiring Pain Point"
    });
    
    // Create activity log
    await base44.entities.ActivityLog.create({
      type: "outreach",
      title: `Outreach message generated for ${contact.full_name} at ${company.name}`,
      description: result.subject,
      company_name: company.name,
      entity_id: message.id
    });
    
    return Response.json({
      success: true,
      messageId: message.id,
      subject: result.subject,
      body: result.body,
      contactName: contact.full_name,
      companyName: company.name
    });
    
  } catch (error) {
    console.error('Error generating outreach:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});