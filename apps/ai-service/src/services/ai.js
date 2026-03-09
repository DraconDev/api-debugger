/* AI integration service - placeholder for LLM API calls */
const AI_PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307'
  }
};

function buildPrompt(data) {
  const { method, url, statusCode, requestHeaders, requestBodyText, responseHeaders, diagnostics } = data;
  
  const headersList = requestHeaders?.map(h => `${h.name}: ${h.value}`).join('\n') || 'None';
  const respHeadersList = responseHeaders?.map(h => `${h.name}: ${h.value}`).join('\n') || 'None';
  const diagnosticsList = diagnostics?.map(d => `- ${d.title}: ${d.explanation}`).join('\n') || 'None';
  
  return `You are an API debugging assistant. Analyze this failed request and explain what went wrong.

Request: ${method} ${url}
Status: ${statusCode}

Request Headers:
${headersList}

${requestBodyText ? `Request Body:\n${requestBodyText}\n` : ''}

Response Headers:
${respHeadersList}

Diagnostics detected:
${diagnosticsList}

Provide a JSON response with this exact structure:
{
  "mostLikelyIssue": "1-2 sentence summary of the problem",
  "evidence": ["list of evidence from request/response"],
  "otherPossibleCauses": ["other potential issues"],
  "nextSteps": ["concrete steps to fix"],
  "confidence": 0.85
}

Keep explanations concise and actionable.`;
}

async function callAI(data, provider = 'openai') {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    // Mock response for development
    return getMockResponse(data);
  }
  
  const prompt = buildPrompt(data);
  const config = AI_PROVIDERS[provider];
  
  // Real implementation would call the AI API here
  // For now, return mock
  return getMockResponse(data);
}

function getMockResponse(data) {
  // Generate helpful mock response based on diagnostics
  const primaryDiag = data.diagnostics?.[0];
  
  return {
    mostLikelyIssue: primaryDiag?.explanation || "The request failed due to an unspecified issue.",
    evidence: primaryDiag?.evidence?.map(e => e.description) || ["Status code indicates failure"],
    otherPossibleCauses: [
      "Network connectivity issues",
      "Server temporarily unavailable",
      "Request timing out"
    ],
    nextSteps: primaryDiag?.suggestions || [
      "Check the response body for error details",
      "Verify request parameters are correct",
      "Try the request again"
    ],
    confidence: 0.8
  };
}

module.exports = { callAI };
