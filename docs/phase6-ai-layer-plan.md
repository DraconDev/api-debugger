# Phase 6 — AI Explanation Layer Blueprint

## Objective
Add AI-powered explanations to complement the deterministic diagnostics engine. AI provides natural language insights and context-specific guidance that rules cannot cover.

## Architecture

### Components
1. **ai-service** - Backend service to proxy AI requests
2. **Extension integration** - UI to request and display AI explanations
3. **Prompt engineering** - Structured prompts for consistent output

### Data Flow
```
User clicks "Explain"
    ↓
Extension sends request + diagnostics to ai-service
    ↓
ai-service sanitizes data, calls LLM API
    ↓
AI returns structured explanation
    ↓
Extension displays explanation in UI
```

## Tasks

### 1. Create ai-service backend
- Location: `apps/ai-service/`
- Minimal Express/Fastify server
- Single endpoint: `POST /api/explain`
- Input: request data + diagnostics
- Output: AI explanation object

### 2. Implement data sanitization
Before sending to AI:
- Redact Authorization header values
- Redact Cookie values
- Redact API keys in URL
- Mask sensitive patterns (passwords, tokens)

### 3. Design prompt template
```javascript
const prompt = `You are an API debugging assistant. Analyze this failed request and explain what went wrong.

Request: ${method} ${url}
Status: ${statusCode}

Request Headers:
${headersList}

${body ? `Request Body:\n${body}\n` : ''}

Response Headers:
${responseHeadersList}

${diagnostics.length ? `Diagnostics detected:\n${diagnosticsList}` : ''}

Provide:
1. Most likely issue (1-2 sentences)
2. Evidence from the request/response
3. Other possible causes (if any)
4. Concrete next steps to fix

Keep the explanation concise and actionable. Use bullet points.`;
```

### 4. Create AI response schema
```typescript
interface AIExplanation {
  mostLikelyIssue: string;
  evidence: string[];
  otherPossibleCauses: string[];
  nextSteps: string[];
  confidence: number; // 0-1
}
```

### 5. Add "Explain with AI" UI
- Button in detail panel (below diagnostics)
- Loading state while requesting
- Display explanation in collapsible section
- Show confidence indicator
- Allow feedback (helpful/not helpful)

### 6. Implement caching
- Cache AI responses for identical requests
- Use request hash as key
- Reduce API costs and improve speed

## Implementation

### Backend service structure
```
apps/ai-service/
  src/
    index.js          # Server entry
    routes/
      explain.js      # Explain endpoint
    services/
      ai.js           # LLM integration
      sanitize.js     # Data sanitization
  package.json
```

### Extension integration
- Add message handler for `GET_AI_EXPLANATION`
- Background script forwards to ai-service
- Panel displays response

## Security Considerations
- Never send full Authorization/Cookie values
- Strip query params that look like API keys
- Allow users to disable AI features
- Log usage but not content
- Rate limit AI requests

## Cost Management
- Use cheaper/faster models for simple cases
- Implement request limits per user
- Cache aggressively
- Queue requests for batch processing

## Acceptance Criteria
- [ ] AI endpoint responds within 5 seconds
- [ ] Sensitive data is redacted before AI processing
- [ ] Explanations are displayed in readable format
- [ ] Users can rate explanations
- [ ] Failed AI requests show graceful error message

## Future Enhancements
- Learn from user feedback
- Customize prompt based on API type
- Support multiple AI providers
- Add streaming responses
- Integrate with API documentation
