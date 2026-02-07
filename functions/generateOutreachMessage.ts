import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      contact_name,
      contact_title,
      contact_seniority,
      company_name,
      company_industry,
      company_description,
      role_title,
      role_description,
      user_background
    } = body;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Claude API not configured' }, { status: 500 });
    }

    const prompt = `You are an expert executive recruiter crafting personalized outreach messages.

Generate 4 different outreach templates for:
- Contact: ${contact_name}, ${contact_title} (${contact_seniority})
- Company: ${company_name} (${company_industry})
- Company description: ${company_description || 'Not provided'}
- Open role: ${role_title}
- Role details: ${role_description || 'Not provided'}

Create messages in this exact JSON format (no markdown, pure JSON):
{
  "email_subject": "subject line here",
  "email_body": "personalized email body here",
  "linkedin_connection": "concise connection request message here",
  "linkedin_message_1": "first personalized LinkedIn message here",
  "linkedin_message_2": "follow-up message here"
}

Requirements:
- Email subject: Compelling, specific to their role/company (under 60 chars)
- Email body: Professional, personalized, 150-250 words, specific value prop
- LinkedIn connection: Friendly, concise, references their role or company
- LinkedIn message 1: More detailed than connection request, 100-150 words
- LinkedIn message 2: Follow-up message, reference mutual connections or recent news if possible

Make each message feel authentic and tailored to ${contact_name}'s specific role and seniority level.`;

    const response = await fetch('https://api.anthropic.com/v1/messages/batch/requests', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          custom_id: 'outreach-msg-1',
          params: {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: prompt
            }]
          }
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return Response.json({ error: 'Failed to generate message' }, { status: 500 });
    }

    const data = await response.json();
    
    // For batch API, we need to poll or handle async
    // For now, use synchronous message API instead
    const syncResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!syncResponse.ok) {
      const error = await syncResponse.json();
      console.error('Claude error:', error);
      return Response.json({ error: 'Failed to generate message' }, { status: 500 });
    }

    const result = await syncResponse.json();
    const content = result.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const messages = JSON.parse(jsonMatch[0]);

    return Response.json({
      email_subject: messages.email_subject,
      email_body: messages.email_body,
      linkedin_connection: messages.linkedin_connection,
      linkedin_message_1: messages.linkedin_message_1,
      linkedin_message_2: messages.linkedin_message_2
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});