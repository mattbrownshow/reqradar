import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      company_name,
      company_industry,
      company_description,
      company_signals = [],
      contact_name,
      contact_title,
      contact_seniority,
      message_type = 'email',
      tone = 'executive_peer',
      active_role = null,
      user_background = ''
    } = await req.json();

    // Build the prompt for Claude
    const prompt = buildOutreachPrompt({
      company_name,
      company_industry,
      company_description,
      company_signals,
      contact_name,
      contact_title,
      contact_seniority,
      message_type,
      tone,
      active_role,
      user_background,
      user_name: user.full_name
    });

    // Call Claude via Base44 integrations
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The generated outreach message'
          },
          explanation: {
            type: 'string',
            description: 'Brief explanation of key elements used'
          }
        },
        required: ['message']
      }
    });

    return Response.json({
      message: response.message,
      explanation: response.explanation,
      message_type,
      tone
    });
  } catch (error) {
    console.error('Error generating outreach message:', error);
    return Response.json(
      { error: error.message || 'Failed to generate message' },
      { status: 500 }
    );
  }
});

function buildOutreachPrompt({
  company_name,
  company_industry,
  company_description,
  company_signals,
  contact_name,
  contact_title,
  contact_seniority,
  message_type,
  tone,
  active_role,
  user_background,
  user_name
}) {
  let charLimit = '';
  let typeDescription = '';

  if (message_type === 'linkedin_connection') {
    charLimit = '300 characters';
    typeDescription = 'LinkedIn connection request message';
  } else if (message_type === 'linkedin_inmail') {
    charLimit = '2000 characters';
    typeDescription = 'LinkedIn InMail message';
  } else if (message_type === 'email') {
    typeDescription = 'professional email';
  }

  const roleContext = active_role ? `
Active Open Role:
- Title: ${active_role.title}
- Location: ${active_role.location}
- Salary: ${active_role.salary_min ? `$${(active_role.salary_min / 1000).toFixed(0)}K - $${(active_role.salary_max / 1000).toFixed(0)}K` : 'Not specified'}
- Description: ${active_role.description}` : '';

  const signalsContext = company_signals.length > 0 ? `
Company Signals:
${company_signals.map(s => `- ${s}`).join('\n')}` : '';

  const toneInstructions = {
    executive_peer: 'Position yourself as a peer executive with relevant experience. Be confident, strategic, and focus on mutual success.',
    problem_solver: 'Focus on capabilities and how you solve specific problems they likely face. Be concrete and specific about what you can help with.',
    warm_intro: 'Use a warm, personal tone. Reference mutual interests or connections. Feel like a genuine introduction from someone who knows them.'
  };

  return `You are drafting a personalized outreach message on behalf of ${user_name}.

RECIPIENT:
- Name: ${contact_name}
- Title: ${contact_title}
- Seniority: ${contact_seniority}

COMPANY CONTEXT:
- Name: ${company_name}
- Industry: ${company_industry}
- Description: ${company_description}${signalsContext}${roleContext}

SENDER BACKGROUND:
${user_background}

MESSAGE PARAMETERS:
- Type: ${typeDescription}${charLimit ? ` (${charLimit})` : ''}
- Tone: ${tone}

TONE GUIDELINES:
${toneInstructions[tone]}

INSTRUCTIONS:
Generate a compelling, personalized message that:
1. References specific company context (signals, open role, industry)
2. Positions ${user_name} as valuable for their current needs
3. Creates genuine interest without being salesy
4. Includes a clear, natural next step
${charLimit ? `5. Stays within the ${charLimit} limit` : ''}
6. Matches the "${tone}" tone exactly
7. Feels researched and specific - NOT a generic template

DO NOT:
- Use generic greetings like "Hi there" or "I hope this finds you well"
- Be overly promotional or salesy
- Make assumptions about their personal life
- Include placeholder text like [Company] or [Name]

IMPORTANT: Only return the message text itself. Make it personal, specific, and compelling.`;
}