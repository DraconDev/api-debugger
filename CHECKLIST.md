# API Debugger - Manual Testing Checklist

> Items marked with ✅ are automatically verified by the test suite.
> Run `npm test` to verify these.

## Core Request Features

### REST API Builder

- [ ] Send a GET request to `https://jsonplaceholder.typicode.com/posts`
- [ ] Send a POST request with JSON body ✅
- [ ] Send a PUT request to update a resource ✅
- [ ] Send a PATCH request with partial body ✅
- [ ] Send a DELETE request ✅
- [ ] Add query parameters and verify they appear in the URL ✅
- [ ] Add custom headers (Accept, Content-Type, X-Custom) ✅
- [ ] Toggle individual headers on/off ✅
- [ ] View response status code, headers, and body
- [ ] View response time and size
- [ ] Search through request history

### Authentication

- [ ] Send request with Bearer token in Authorization header ✅
- [ ] Send request with Basic Auth (username/password) ✅
- [ ] Send request with API Key in header ✅
- [ ] Send request with API Key in query param ✅
- [ ] No Auth returns empty headers ✅

### Body Types

- [ ] Send JSON body ✅
- [ ] Send form-data (multipart) body ✅
- [ ] Send x-www-form-urlencoded body ✅
- [ ] Send raw text body ✅
- [ ] Send empty body (GET/DELETE) ✅
- [ ] Handle large JSON body (1MB+) ✅
- [ ] Handle GraphQL query body ✅

## Protocol Support

### WebSocket

- [ ] Connect to `wss://echo.websocket.org`
- [ ] Send a text message
- [ ] Receive echoed message
- [ ] View message history with timestamps
- [ ] Search/filter messages
- [ ] Disconnect and reconnect
- [ ] Events auto-scroll (no toggle visible)
- [ ] Validate WebSocket URL format ✅
- [ ] Handle query params in WebSocket URL ✅
- [ ] Handle binary WebSocket messages ✅

### Server-Sent Events (SSE)

- [ ] Connect to an SSE endpoint
- [ ] Receive events in real-time
- [ ] View event data, type, and ID
- [ ] Auto-reconnect toggle works
- [ ] Events auto-scroll (no toggle visible)
- [ ] Disconnect cleanly
- [ ] Parse SSE event format ✅
- [ ] Handle multi-line data ✅
- [ ] Extract event ID ✅
- [ ] Handle JSON data in events ✅

### Socket.IO

- [ ] Connect to a Socket.IO server
- [ ] Send custom events
- [ ] Receive events
- [ ] Add/remove listen event names
- [ ] View connection transport (polling/websocket)
- [ ] Events auto-scroll (no toggle visible)
- [ ] Validate Socket.IO URL ✅
- [ ] Handle namespace format ✅
- [ ] Construct emit event ✅

### GraphQL

- [ ] Send a GraphQL query
- [ ] Send a GraphQL mutation
- [ ] View formatted response
- [ ] See query errors in response
- [ ] Handle basic query structure ✅
- [ ] Handle query with variables ✅
- [ ] Handle mutations ✅
- [ ] Handle fragments ✅

## Collections & Saved Requests

### Collections

- [ ] View collections in sidebar
- [ ] Click collection to see its requests
- [ ] Click a saved request to load it in builder
- [ ] Run all requests in a collection
- [ ] "+ Demo" button loads demo examples
- [ ] "Load Demo Examples" button in empty state

### Import

- [ ] Import OpenAPI/Swagger spec (JSON) ✅
- [ ] Import OpenAPI/Swagger spec (YAML)
- [ ] Import Postman Collection v2.1 ✅
- [ ] Import Insomnia export ✅
- [ ] Import HAR file ✅
- [ ] Import cURL command ✅
- [ ] Imported collections appear in sidebar
- [ ] Imported requests are runnable

## Profiles

### Profile Management (Settings → Profiles)

- [ ] See "Demo Examples" built-in profile
- [ ] Click "Switch" to change active profile
- [ ] Page reloads with new profile data
- [ ] Click "+ New Profile" to create empty profile
- [ ] Type name and press Enter to create
- [ ] Click "Duplicate" to copy a profile
- [ ] Click "Delete" to remove custom profile
- [ ] Cannot delete built-in profiles
- [ ] Click "Reset" on Demo to restore default data
- [ ] Active profile shows "Active" badge
- [ ] Profile structure validates correctly ✅
- [ ] Profile data includes collections, requests, environments ✅
- [ ] AI settings saved to profile ✅
- [ ] Built-in vs custom profile distinction works ✅

### Demo Profile (Auto-Verified ✅)

- [ ] Contains 4 collections ✅
- [ ] Collection names include REST APIs, Authentication, Scripts, Advanced ✅
- [ ] Contains 16 saved requests ✅
- [ ] Every collection has at least one request ✅
- [ ] Has GET, POST, PUT, PATCH, DELETE methods ✅
- [ ] Has JSON body type requests ✅
- [ ] Has form-data body type requests ✅
- [ ] Has urlencoded body type requests ✅
- [ ] Has bearer auth request ✅
- [ ] Has basic auth request ✅
- [ ] Has pre-request script (pm.variables) ✅
- [ ] Has post-response script (pm.test) ✅
- [ ] Has pm.test() assertions ✅
- [ ] Has requests with query params ✅
- [ ] Has requests with variable interpolation ({{var}}) ✅
- [ ] Has 3 environments ✅
- [ ] Environments have variables ✅
- [ ] Exactly one active environment ✅
- [ ] Has baseUrl variable in environments ✅
- [ ] All requests have tags array and createdAt ✅
- [ ] All environments have createdAt and updatedAt ✅
- [ ] Request stubs have url and method ✅

## AI Integration

### Settings (Settings → AI Settings)

- [ ] Enter OpenRouter API key
- [ ] Click "Test Key" to validate
- [ ] Shows "✓ API key is valid" for valid key
- [ ] Shows "✗ API key validation failed" for invalid key
- [ ] Search for models in the model list
- [ ] Select a primary model from the list
- [ ] Model list shows provider, name, context length
- [ ] Add up to 3 fallback models
- [ ] Reorder fallbacks with ↑/↓ arrows
- [ ] Remove fallback with ✕ button
- [ ] Click "Save" to persist settings
- [ ] AI settings saved to both global and profile storage

### AI Analysis

- [ ] Select a request with response data
- [ ] AI Analysis panel shows on the right
- [ ] Click "Analyze" to get AI analysis
- [ ] "Analysis" tab shows request summary and issues
- [ ] "Explain" tab explains the endpoint
- [ ] "Suggest" tab gives optimization tips
- [ ] Shows which model was used
- [ ] Shows "(fallback)" if fallback model was used
- [ ] "Regenerate" button re-runs analysis
- [ ] Fallback chain works when primary model fails ✅
- [ ] Does NOT fallback on auth errors (401/403) ✅
- [ ] AIError has status and model properties ✅

## Environments (Settings → Environments)

- [ ] Create a new environment
- [ ] Add variables (key/value pairs)
- [ ] Toggle variables on/off
- [ ] Set active environment
- [ ] Variables resolve in request URLs ({{var}}) ✅
- [ ] Variables resolve in request bodies ✅
- [ ] Variables resolve in headers ✅
- [ ] Missing variables return empty string ✅
- [ ] Non-matching braces are preserved ✅
- [ ] Switch between environments

## Pre/Post Scripts

- [ ] Pre-request script runs before request
- [ ] `pm.variables.set()` sets a variable ✅
- [ ] `pm.variables.get()` reads a variable ✅
- [ ] `pm.variables.unset()` removes a variable ✅
- [ ] `pm.variables.clear()` clears all variables ✅
- [ ] `console.log()` output visible
- [ ] Post-response script runs after response
- [ ] `pm.response.json()` parses response body
- [ ] `pm.test()` creates test assertions ✅
- [ ] `pm.expect().to.equal()` validates values ✅
- [ ] `pm.expect().to.be.a()` checks types ✅
- [ ] Multiple tests run independently ✅
- [ ] Test results shown in response panel

## Test Mode

- [ ] Navigate to Test Mode from sidebar
- [ ] See 14 pre-loaded public API examples
- [ ] Click an example to load it
- [ ] Send the request and see response
- [ ] Examples cover different methods and auth types

## Workflow Simulator

- [ ] Navigate to Workflows from sidebar
- [ ] Add requests to workflow
- [ ] Set iterations and concurrency
- [ ] Start load test
- [ ] See real-time metrics (RPS, avg/min/max duration)
- [ ] See pass/fail assertion counts
- [ ] Stop workflow mid-run

## GitHub Sync (Settings → Sync)

- [ ] Click "Create GitHub Token" button
- [ ] Paste Personal Access Token
- [ ] Click "Connect" to validate
- [ ] Shows connected username
- [ ] Configure repository name
- [ ] Configure branch name
- [ ] Configure optional path
- [ ] Click "Save Settings"
- [ ] Click "Push" to upload data
- [ ] Click "Pull" to download data
- [ ] Push syncs all profiles + AI settings
- [ ] Pull restores all profiles + AI settings
- [ ] Last sync timestamp updates
- [ ] "Disconnect" removes token
- [ ] Sync data has v2.0 structure with profiles ✅
- [ ] Sync data is backward-compatible with v1.0 ✅
- [ ] Sync data is serializable to JSON ✅
- [ ] Profile data includes AI settings in sync ✅

## Capture & Filtering

- [ ] Extension captures browser API requests automatically
- [ ] Toggle capture on/off from popup
- [ ] Search requests by URL, method, or status code
- [ ] Select multiple requests (checkboxes)
- [ ] Delete selected requests
- [ ] Export selected requests
- [ ] Clear all history

## Sidebar & Navigation

- [ ] Sidebar collapses to icon-only mode (chevron click)
- [ ] Icons remain visible when collapsed
- [ ] Text labels hidden when collapsed
- [ ] "?" button in footer navigates to Settings
- [ ] "?" button visible in both expanded and collapsed states
- [ ] All nav items clickable (builder, websocket, SSE, etc.)
- [ ] Request count shown in footer

## Popup

- [ ] Shows request count
- [ ] Quick stats (Total, Success, Errors)
- [ ] Filter by All/Success/Errors
- [ ] Quick actions (New, WS, GQL, History, Settings)
- [ ] Recent 5 requests listed
- [ ] Click request opens history in dashboard
- [ ] "Open Dashboard" button works
- [ ] Capture toggle on/off
- [ ] Clear history button

## Keyboard Shortcuts

- [ ] `Ctrl+R` refreshes request list
- [ ] `Ctrl+N` creates new request
- [ ] `?` opens shortcuts modal
- [ ] Shortcuts modal lists all available shortcuts

## Import Sources

- [ ] Postman Collection v2.1 (JSON) ✅
- [ ] Insomnia export (JSON) ✅
- [ ] OpenAPI 3.0 (JSON) ✅
- [ ] OpenAPI 3.0 (YAML)
- [ ] Swagger 2.0 (JSON)
- [ ] HAR 1.2 file ✅
- [ ] cURL command string ✅
- [ ] Detect format automatically ✅
- [ ] Parse cURL with headers and auth ✅
- [ ] Parse Postman with folders ✅
- [ ] Parse OpenAPI with paths ✅
- [ ] Parse Insomnia with environments ✅

## Header & Param Handling

- [ ] Enabled headers are included ✅
- [ ] Disabled headers are excluded ✅
- [ ] Headers default to enabled ✅
- [ ] Empty header names are skipped ✅
- [ ] Multiple headers handled correctly ✅
- [ ] Query params build correct string ✅
- [ ] Special characters are URL-encoded ✅
- [ ] Disabled params are excluded ✅
- [ ] Equals signs in values are encoded ✅

## HTTP Status Classification

- [ ] 2xx classified as success ✅
- [ ] 3xx classified as redirect ✅
- [ ] 4xx classified as client-error ✅
- [ ] 5xx classified as server-error ✅
- [ ] GET/HEAD/OPTIONS are safe methods ✅
- [ ] POST/PUT/PATCH/DELETE are unsafe methods ✅

## Theme

- [ ] Dark theme is default
- [ ] Theme toggle switches between light/dark
- [ ] All colors use CSS variables (no hardcoded colors)
- [ ] Destructive (red), success (green), warning (yellow) consistent

---

**Total: ~130 items | Auto-verified: ~84 | Manual: ~46**
