# API Debugger - Chrome Web Store Listing

## Title

**API Debugger** (or **API Debugger - Capture, Inspect, Debug**)

## Short Description

Inspect every HTTP request your browser makes. Capture, replay, build, and debug APIs. No account needed.

## Full Description

### WHAT THIS IS

A Chrome extension that lets you see every HTTP request your browser sends. You can capture requests automatically as you browse, or build requests manually. Inspect headers, bodies, timing, and responses. Replay requests with modifications. Save them to collections.

### WHAT YOU CAN DO

**Capture Mode**

- Automatically captures every HTTP request your browser makes
- See request/response headers, body, status codes, timing breakdown
- Filter by domain, method, or status
- Works with any website or API

**Request Builder**

- Build requests from scratch: GET, POST, PUT, PATCH, DELETE, etc.
- Add headers, query params, body (JSON, form-data, URL-encoded, raw)
- Authentication: Bearer tokens, Basic auth, API keys, OAuth 2.0
- Pre-request scripts to modify requests before sending (Postman-compatible syntax)
- Post-response scripts to extract variables and run assertions

**Protocols**

- REST: Full HTTP client
- WebSocket: Connect, send, receive
- GraphQL: Query editor with variables
- SSE: Server-Sent Events client
- Socket.IO: Full support with namespaces and auth

**Advanced**

- Collections to organize saved requests
- Environment variables with `{{variable}}` syntax
- Collection runner for batch execution
- Variable extraction from responses for chaining requests
- Import from Postman, Insomnia, OpenAPI, HAR, or cURL

**AI Integration (Bring Your Own Key)**

- Analyze requests and responses with AI
- Uses your own OpenRouter API key - we never see your data
- Default model is free (openrouter/free)

**Privacy**

- All data stored locally in your browser
- No account required
- No telemetry, no analytics, no tracking
- GitHub sync uses YOUR GitHub token - we never see it

### WHAT THIS IS NOT

- Not a Postman clone
- Not a SaaS product
- Not collecting your data
- Not requiring an account
- Not a subscription service

### PERMISSIONS

- `webRequest` + `webRequestAuthProvider`: To capture browser traffic
- `storage`: To save your requests and settings locally
- `tabs`, `activeTab`: To open the debugger dashboard
- `cookies`: For Socket.IO and auth flows
- `host_permissions: <all_urls>`: Required to capture requests from any website

### NO VENDOR LOCK-IN

Export everything to standard formats: Postman collections, OpenAPI specs, cURL commands.
