# Phase 5 — Diagnostics Rules Engine Blueprint

## Objective
Automatically explain **why requests fail** using deterministic rules (no AI at this stage). This provides immediate value and is also the foundation for the AI explanation layer later.

## Goals
- Detect common failure patterns using request + response metadata
- Provide human-readable explanations
- Suggest concrete next steps
- Surface evidence from headers, status, body

## Failure Types to Cover (v1)

### 1. Authentication Issues
- **401 Unauthorized**
  - Missing `Authorization` header
  - Expired/invalid token
  - Wrong auth scheme (Basic vs Bearer)
- **403 Forbidden**
  - Missing permissions
  - Token present but insufficient scope
  - IP/domain restrictions

### 2. CORS Issues
- Missing `Access-Control-Allow-Origin` header
- Preflight failure (OPTIONS request failed)
- Credentials mode mismatch
- Wildcard origin with credentials

### 3. Request/Response Format Issues
- **400 Bad Request**
  - Malformed JSON in request body
  - Missing required fields
  - Invalid content-type
- **415 Unsupported Media Type**
  - Wrong/missing `Content-Type` header
- **422 Unprocessable Entity**
  - Schema validation failure
  - Field type mismatch

### 4. Network/Infrastructure Issues
- **5xx Server Errors**
  - Temporary server failure (500)
  - Bad gateway (502)
  - Service unavailable (503)
  - Gateway timeout (504)
- **Timeouts**
  - Request took too long
- **Connection failures**
  - DNS resolution failed
  - Connection refused
  - SSL/TLS errors

### 5. Rate Limiting
- **429 Too Many Requests**
  - Rate limit exceeded
  - Retry-After header present

### 6. Redirect Issues
- Infinite redirect loops
- HTTP → HTTPS redirect issues
- Missing trailing slash redirects

## Data Model

```typescript
interface Diagnostic {
  type: string;           // e.g., "auth_missing", "cors_error"
  severity: "error" | "warning" | "info";
  title: string;          // Short description
  explanation: string;    // Detailed explanation
  evidence: Evidence[];   // Supporting facts from request/response
  suggestions: string[];  // Actionable next steps
  confidence: number;     // 0-1, how certain we are
}

interface Evidence {
  source: "request" | "response" | "headers" | "body" | "timing";
  field: string;
  value: string;
  description: string;
}
```

## Rule Implementation

### Rule Priority Order
1. Status code-based rules (highest confidence)
2. Header-based rules
3. Body/content-based rules
4. Heuristic rules (lower confidence)

### Rule Structure
```javascript
function detectAuthIssues(record) {
  const diagnostics = [];
  
  if (record.statusCode === 401) {
    const hasAuth = record.requestHeaders.some(h => 
      h.name.toLowerCase() === 'authorization'
    );
    
    if (!hasAuth) {
      diagnostics.push({
        type: 'auth_missing',
        severity: 'error',
        title: 'Missing authentication',
        explanation: 'The server rejected the request because no authentication credentials were provided.',
        evidence: [
          { source: 'response', field: 'statusCode', value: '401', description: 'Unauthorized status' },
          { source: 'headers', field: 'Authorization', value: '(missing)', description: 'No Authorization header found' }
        ],
        suggestions: [
          'Add an Authorization header with a valid token',
          'Check if the endpoint requires Bearer token or Basic auth',
          'Verify authentication is enabled for this endpoint'
        ],
        confidence: 0.95
      });
    }
  }
  
  return diagnostics;
}
```

## Tasks

### 1. Create diagnostics module
- `apps/extension/utils/diagnostics.js`
- Export `analyzeRequest(record)` function
- Returns array of `Diagnostic` objects

### 2. Implement status code rules
- 401 → auth issues
- 403 → permission issues
- 404 → resource not found
- 429 → rate limiting
- 500-504 → server errors

### 3. Implement CORS detection
- Check for `Access-Control-Allow-Origin` in response headers
- Detect preflight failures
- Handle credential mode mismatches

### 4. Implement content validation rules
- Parse JSON request body, detect parse errors
- Check Content-Type header vs actual body
- Identify schema validation hints from 422 responses

### 5. Add diagnostics UI
- New "Diagnostics" section in detail panel
- Show each diagnostic with severity indicator
- Display evidence list
- Show actionable suggestions
- Expandable details

### 6. Add timing analysis
- Detect slow responses (> 1s)
- Flag potential timeout issues
- Suggest optimization when applicable

## UI Design

```
┌─────────────────────────────────────┐
│ Diagnostics                         │
├─────────────────────────────────────┤
│ ⚠ Missing authentication            │
│   The server rejected the request   │
│   because no authentication         │
│   credentials were provided.        │
│                                     │
│   Evidence:                         │
│   • Status: 401 Unauthorized        │
│   • No Authorization header found   │
│                                     │
│   Suggestions:                      │
│   • Add Authorization header        │
│   • Verify auth scheme required     │
│   • Check token validity            │
│                                     │
│   Confidence: 95%                   │
└─────────────────────────────────────┘
```

## Integration Points

1. **Run after request capture**
   - Automatically analyze failed requests (4xx, 5xx)
   - Store diagnostics with request record

2. **Run after replay**
   - Analyze replay result
   - Compare with original diagnostics

3. **Show in request detail**
   - Display diagnostics prominently for failed requests
   - Show severity color coding

4. **Feed to AI layer (Phase 6)**
   - Provide diagnostics as structured input
   - AI adds context-specific guidance

## Acceptance Criteria

- [ ] Diagnostics automatically run on failed requests
- [ ] At least 10 common failure patterns detected
- [ ] Each diagnostic includes explanation + suggestions
- [ ] UI clearly shows diagnostic severity
- [ ] Confidence scores are reasonable (validated manually)
- [ ] No false positives on clearly successful requests
- [ ] Performance: analysis completes in < 50ms

## Testing Strategy

- Create test cases for each rule type
- Use sample request/response data
- Verify correct diagnostics are generated
- Check for false positives/negatives
- Manual testing with real websites

## Future Enhancements

- Learn from user feedback (helpful/not helpful)
- Add more specialized rules for common APIs
- Detect patterns across multiple requests
- Integrate with API documentation (OpenAPI specs)
