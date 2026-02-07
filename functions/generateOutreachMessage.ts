import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      role_title,
      role_description,
      role_salary_min,
      role_salary_max,
      company_name,
      company_industry,
      company_description,
      contact_name,
      contact_title,
      contact_seniority,
      user_background
    } = await req.json();

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
    }

    const prompt = `You are an executive recruiter helping a qualified candidate reach out to decision makers.

CANDIDATE BACKGROUND:
${user_background || 'Experienced professional looking for new opportunities'}

TARGET ROLE:
Title: ${role_title}
Company: ${company_name}
Industry: ${company_industry}
Salary Range: $${role_salary_min?.toLocaleString() || '0'} - $${role_salary_max?.toLocaleString() || '0'}
Description: ${role_description || 'N/A'}

DECISION MAKER:
Name: ${contact_name}
Title: ${contact_title}
Seniority: ${contact_seniority}

Generate personalized outreach messaging in the following formats:

1. EMAIL SUBJECT LINE (10 words max)
2. EMAIL BODY (150-200 words, professional but warm tone)
3. LINKEDIN CONNECTION REQUEST (300 characters max)
4. LINKEDIN FIRST MESSAGE (if they accept connection, 200 words)
5. LINKEDIN SECOND FOLLOW-UP (if no response after 5 days, 150 words)

Make it highly personalized based on the candidate's background and the specific role. Highlight relevant experience. Be confident but not arrogant. Include a clear call to action.

Output ONLY valid JSON in this exact format:
{
  "email_subject": "...",
  "email_body": "...",
  "linkedin_connection": "...",
  "linkedin_message_1": "...",
  "linkedin_message_2": "..."
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const data = await response.json();

    if (!data.content || !data.content[0]) {
      return Response.json({ error: 'No response from Claude' }, { status: 500 });
    }

    const messageText = data.content[0].text;
    const jsonMatch = messageText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Failed to extract JSON:', messageText);
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return Response.json({
      success: true,
      data: {
        email_subject: parsed.email_subject,
        email_body: parsed.email_body,
        linkedin_connection: parsed.linkedin_connection,
        linkedin_message_1: parsed.linkedin_message_1,
        linkedin_message_2: parsed.linkedin_message_2
      }
    });

  } catch (error) {
    console.error('Outreach generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});