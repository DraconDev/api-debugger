# Developer Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Extension                        │
│                                                               │
│  ┌──────────────┐      ┌──────────────┐   ┌──────────────┐ │
│  │   Manifest   │      │   Background  │   │     Panel    │ │
│  │   (MV3)      │──────│   Service     │───│     UI       │ │
│  │              │      │   Worker      │   │              │ │
│  └──────────────┘      └──────────────┘   └──────────────┘ │
│         │                     │                     │        │
│         │    ┌────────────────┴────────────────────┘        │
│         │    │                                                 │
│  ┌──────▼────▼────────────────────────────────────────────┐ │
│  │                    Utility Modules                      │ │
│  │  diff  diagnostics  export  collections  sync  agent   │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │    Agent     │  │     API      │  │  AI Service  │
  │   (Local)    │  │   (Cloud)    │  │   (Cloud)    │
  └──────────────┘  └──────────────┘  └──────────────┘
```

## Component Details

### 1. Extension (`apps/extension`)

#### manifest.json
Chrome extension manifest (Manifest V3):
- Defines permissions: `webRequest`, `storage`, `tabs`
- Configures background service worker
- Sets up popup UI

#### background.js
Service worker that:
- Listens for web requests via `chrome.webRequest` API
- Captures request/response metadata
- Stores requests in `chrome.storage.local`
- Handles messages from panel UI

Key functions:
```javascript
// Request capture
chrome.webRequest.onCompleted.addListener(...)
chrome.webRequest.onBeforeRequest.addListener(...)
chrome.webRequest.onBeforeSendHeaders.addListener(...)

// Message handling
chrome.runtime.onMessage.addListener(...)
```

#### panel/panel.js
Main UI logic:
- Renders request history
- Shows request details
- Handles replay, export, collections
- Manages view state (history/collections/sync)

Key functions:
```javascript
render()              // Main render loop
showDetail(r)         // Show request details
renderReplayBlock()   // Replay UI
renderDiagnostics()   // Show failure analysis
renderExportBlock()   // Export buttons
```

#### Utility Modules

**diff.js**
- `diffStatus(original, replay)` - Compare status codes
- `diffHeaders(original, modified)` - Find header changes
- `diffText(original, modified)` - Line-by-line text diff

**diagnostics.js**
- `analyzeRequest(record)` - Detect failure patterns
- Rules for: 401, 403, 404, 400, 500-504, CORS, JSON, content-type, rate limiting, timing

**export.js**
- `toCurl(record)` - Generate cURL command
- `toFetch(record)` - Generate Fetch API code
- `toJson(record)` - Export as JSON
- `copyToClipboard(text)` - Copy helper

**collections.js**
- Collection CRUD operations
- Saved request management
- Uses `chrome.storage.local`

**sync.js**
- Authentication with backend
- Collection sync (push/pull)
- Token management

**agent.js**
- Local agent communication
- Health checks
- Request proxying

### 2. Local Agent (`apps/agent`)

Lightweight Node.js server for localhost access:

```javascript
class Agent {
  // Express server setup
  setupRoutes() {
    POST /replay      // Forward request to localhost
    POST /discover    // Find running local servers
    GET  /health      // Health check
  }
  
  // HTTP request handling
  makeRequest({ url, method, headers, body, timeout })
}
```

Key features:
- CORS enabled for extension origin
- Request timeout handling
- Response size limiting (1MB)
- Protocol validation (HTTP/HTTPS only)

### 3. Backend API (`apps/api`)

Express server for cloud sync:

```javascript
// Auth routes
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

// Collection routes
GET    /api/collections
POST   /api/collections
PUT    /api/collections/:id
DELETE /api/collections/:id

// Saved requests
GET    /api/saved-requests
POST   /api/saved-requests
PUT    /api/saved-requests/:id
DELETE /api/saved-requests/:id

// Sync
POST /api/sync/push
GET  /api/sync/pull
```

Authentication:
- JWT tokens
- 7-day expiration
- Bearer auth in headers

Storage:
- In-memory (MVP)
- Map-based collections
- User isolation

### 4. AI Service (`apps/ai-service`)

LLM integration for explanations:

```javascript
POST /api/explain
Body: { request, diagnostics }
Response: {
  mostLikelyIssue: string,
  evidence: string[],
  otherPossibleCauses: string[],
  nextSteps: string[],
  confidence: number
}
```

Sanitization:
- Redacts Authorization headers
- Masks Cookie values
- Removes API keys from URLs
- Strips sensitive body fields

## Data Models

### Request Record
```javascript
{
  id: string,
  url: string,
  method: string,
  statusCode: number,
  requestHeaders: Array<{name: string, value: string}>,
  requestBody: object | null,
  requestBodyText: string,
  responseHeaders: Array<{name: string, value: string}>,
  startTime: number,
  timeStamp: number,
  duration: number,
  type: string,
  tabId: number
}
```

### Collection
```javascript
{
  id: string,
  name: string,
  description: string,
  createdAt: number,
  updatedAt: number,
  requestCount: number
}
```

### Saved Request
```javascript
{
  id: string,
  collectionId: string,
  name: string,
  description: string,
  request: RequestRecord,
  tags: string[],
  createdAt: number
}
```

### Diagnostic
```javascript
{
  type: string,
  severity: 'error' | 'warning' | 'info',
  title: string,
  explanation: string,
  evidence: Array<{
    source: string,
    field: string,
    value: string,
    description: string
  }>,
  suggestions: string[],
  confidence: number
}
```

## Request Flow

### Capture Flow
```
Browser makes request
    ↓
chrome.webRequest.onBeforeRequest
    ↓ (capture start time, body)
chrome.webRequest.onBeforeSendHeaders
    ↓ (capture request headers)
chrome.webRequest.onHeadersReceived
    ↓ (capture response headers)
chrome.webRequest.onCompleted
    ↓ (assemble complete record)
Store in chrome.storage.local
    ↓
Emit to panel UI
```

### Replay Flow
```
User clicks "Send replay"
    ↓
Panel calls sendReplay()
    ↓
Background receives REPLAY_REQUEST message
    ↓
Background makes fetch() call
    ↓
Response captured and returned
    ↓
Panel displays result
    ↓
Diff engine compares original vs replay
```

### Agent Replay Flow
```
User checks "Use local agent"
    ↓
Panel calls agentService.replayViaAgent()
    ↓
POST to http://localhost:47321/replay
    ↓
Agent makes request to target URL
    ↓
Agent returns response
    ↓
Panel displays result
```

## Storage

### Extension Storage (`chrome.storage.local`)

Keys:
- `requests` - Array of captured requests (max 200)
- `collections` - User collections
- `savedRequests` - Saved request items
- `api_debugger_auth_token` - JWT token
- `api_debugger_user` - User object
- `api_debugger_agent_url` - Agent URL

Limits:
- 5MB total storage
- JSON serialization required
- Sync vs local storage choice

### Backend Storage (In-Memory)

Maps:
- `users` - User accounts
- `collections` - User collections
- `savedRequests` - Saved requests

## Security Considerations

### Extension
- No sensitive data sent externally without user action
- Headers/body stored locally by default
- Export includes all data (user choice)

### Agent
- Only HTTP/HTTPS allowed
- Request timeout enforced
- Response size limited
- CORS restricted to extension origins

### Backend API
- JWT tokens for auth
- Password hashing (Base64 - upgrade to bcrypt for production)
- User data isolated by userId
- No sensitive logging

### AI Service
- Authorization headers redacted
- Cookie values masked
- API keys stripped from URLs
- Request body sanitized

## Performance Optimization

### Request Capture
- Partial data stored during request lifecycle
- Assembled only on completion
- 200 request limit prevents memory bloat
- Eviction policy (FIFO)

### UI Rendering
- Direct DOM manipulation (no virtual DOM)
- Minimal re-renders
- Scrollable containers for large content
- Truncation for oversized bodies

### Replay
- AbortController for timeout handling
- Response streaming disabled
- Body size limits

### Agent
- Connection pooling (Node.js http agent)
- Request queuing
- Timeout enforcement

## Error Handling

### Extension
- Try-catch in background listeners
- Error messages shown in UI
- Graceful degradation (missing features hidden)
- Console logging for debugging

### Agent/API
- HTTP error codes
- JSON error responses
- Request validation
- Graceful shutdown

### User Feedback
- Loading states on buttons
- Success/error messages
- Timeout feedback
- Connection errors displayed

## Testing Strategy

### Unit Tests
- Test utility functions in isolation
- Mock `chrome` APIs
- Test diagnostics rules
- Test export formatting

### Integration Tests
- Test message passing
- Test storage operations
- Test replay flow
- Test sync operations

### E2E Tests
- Load extension in browser
- Simulate user interactions
- Test complete workflows
- Cross-browser testing

### Manual Tests
- See `docs/TESTING.md` for checklist
- Real-world API testing
- Performance testing
- Edge case handling

## Debugging

### Extension
```javascript
// In background.js
console.log('[api-debugger]', data);

// In panel.js
console.log('Panel:', state);
```

Check console:
1. `chrome://extensions`
2. Click "Inspect views: service worker"
3. View Console tab

### Agent/API
```bash
# Check if running
curl http://localhost:47321/health
curl http://localhost:4321/health

# View logs
npm start  # Logs to stdout
```

### Common Issues

**Extension not loading:**
- Check manifest.json syntax
- Verify all files exist
- Check for JavaScript errors

**Requests not capturing:**
- Verify permissions
- Check if URL matches `<all_urls>`
- Refresh page after install

**Replay failing:**
- Check network tab
- Verify URL accessibility
- Check CORS headers

**Agent connection failed:**
- Verify agent running
- Check port availability
- Disable firewall temporarily

## Extending the Project

### Adding New Diagnostic Rules

```javascript
// In diagnostics.js
function detectCustomIssue(record) {
  const diagnostics = [];
  
  if (/* your condition */) {
    diagnostics.push({
      type: 'custom_issue',
      severity: 'error',
      title: 'Custom Issue',
      explanation: '...',
      evidence: [...],
      suggestions: [...],
      confidence: 0.9
    });
  }
  
  return diagnostics;
}

// Add to analyzeRequest()
function analyzeRequest(record) {
  const diagnostics = [];
  diagnostics.push(...detectCustomIssue(record));
  // ...
}
```

### Adding New Export Format

```javascript
// In export.js
function toPython(record) {
  return `import requests

response = requests.${record.method.toLowerCase()}(
    '${record.url}',
    headers=${JSON.stringify(headersObject)},
    ${record.requestBodyText ? `data='${record.requestBodyText}'` : ''}
)
print(response.status_code)
print(response.json())
`;
}

window.exportHelpers.toPython = toPython;
```

### Adding New API Endpoint

```javascript
// In backend routes
router.get('/custom-endpoint', requireAuth, (req, res) => {
  // Handle request
  res.json({ success: true, data: {} });
});
```

### Adding New UI Feature

1. Add HTML structure in panel.js
2. Add event handlers
3. Update render functions
4. Add necessary CSS in index.html

## Best Practices

1. **Keep functions small** - One responsibility per function
2. **Use descriptive names** - `renderReplayBlock` not `render2`
3. **Handle errors gracefully** - Never crash the extension
4. **Test edge cases** - Empty data, large data, special chars
5. **Document public APIs** - JSDoc comments for key functions
6. **Use storage sparingly** - Clean up old data
7. **Validate inputs** - Check URLs, methods, headers
8. **Respect user privacy** - No unnecessary data collection

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes following conventions
4. Add tests for new features
5. Update documentation
6. Submit pull request

## Future Architecture

Potential improvements:

1. **Database Integration** - Replace in-memory storage
2. **WebSocket Support** - Capture WS frames
3. **gRPC Support** - Via local agent
4. **Plugin System** - Custom diagnostic rules
5. **Theme System** - Customizable UI
6. **Testing Framework** - Automated test suite
7. **CI/CD Pipeline** - Automated builds and tests
8. **Telemetry** - Anonymous usage metrics (opt-in)
