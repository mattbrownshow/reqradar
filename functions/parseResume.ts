import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Extract text from resume
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          full_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          linkedin_url: { type: 'string' },
          current_title: { type: 'string' },
          current_company: { type: 'string' },
          years_experience: { type: 'number' },
          education: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          previous_employers: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' }
        }
      }
    });

    if (extractResult.status !== 'success') {
      return Response.json({ 
        error: 'Failed to extract resume data',
        details: extractResult.details 
      }, { status: 400 });
    }

    const extractedData = extractResult.output;

    // Use AI to infer job search criteria from resume content
    const inferenceResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this resume data, infer the candidate's target roles and industries:
      
Title: ${extractedData.current_title}
Current Company: ${extractedData.current_company}
Years of Experience: ${extractedData.years_experience}
Skills: ${extractedData.skills?.join(', ')}
Summary: ${extractedData.summary}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "target_roles": ["role1", "role2"],
  "industries": ["industry1", "industry2"],
  "inference_confidence": "high" | "medium" | "low"
}

Target roles should be real C-Suite, VP, or Director titles. Industries should be standard industry categories.`,
      response_json_schema: {
        type: 'object',
        properties: {
          target_roles: { type: 'array', items: { type: 'string' } },
          industries: { type: 'array', items: { type: 'string' } },
          inference_confidence: { type: 'string' }
        }
      }
    });

    // Combine extracted and inferred data
    const parsed_data = {
      full_name: extractedData.full_name,
      email: extractedData.email || user.email,
      phone: extractedData.phone,
      linkedin_url: extractedData.linkedin_url,
      current_title: extractedData.current_title,
      years_experience: extractedData.years_experience,
      education: extractedData.education,
      skills: extractedData.skills || [],
      previous_employers: extractedData.previous_employers || [],
      target_roles: inferenceResult.target_roles || [],
      industries: inferenceResult.industries || []
    };

    return Response.json({
      success: true,
      parsed_data,
      confidence: inferenceResult.inference_confidence
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return Response.json({ 
      error: 'Failed to parse resume',
      details: error.message 
    }, { status: 500 });
  }
});