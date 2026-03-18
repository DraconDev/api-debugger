# API Debugger - Manual Test Checklist

> Open extension → Dashboard loads. Switch to **🎯 Demo Examples** profile.
> `npm test` covers 881 auto tests. These need a human.

## First Run

- [ ] Extension icon click → opens dashboard (no popup)
- [ ] Sidebar shows "🏠 My Workspace" in profile dropdown at top
- [ ] Dropdown shows 🎯 Demo Examples as second option
- [ ] Click Demo → page reloads → 33 requests across 5 collections

## Profile Dropdown

- [ ] Switch to Demo → collections fill with 33 requests
- [ ] Switch back to My Workspace → empty collections
- [ ] Settings → Profiles → Create "Test Project" → appears in dropdown
- [ ] Duplicate Demo → "Demo Examples (copy)" appears → Delete it
- [ ] Reset Demo → restores all 33 requests

## Sending Requests (Demo profile)

- [ ] **Get Posts** → Send → 200, JSON with posts array
- [ ] **Create Post** → Send → 201, response has your title
- [ ] **Update Post** → Send → 200
- [ ] **Patch Post** → Send → 200
- [ ] **Delete Post** → Send → 200
- [ ] **Get Single User** → Send → 200, user data
- [ ] Method dropdown shows colored badge: GET=green, POST=blue, PUT=orange, DELETE=red

## Auth (Demo profile)

- [ ] **Bearer Token** → Send → httpbin echoes your auth header
- [ ] **Basic Auth** → Send → `{"authenticated": true}`
- [ ] **API Key in Header** → Send → httpbin shows your header
- [ ] **API Key in Query** → Send → httpbin shows your params
- [ ] **OAuth 2.0 Setup** → Select Client Credentials flow → enter details → "Get Access Token"

## Scripts (Demo profile)

- [ ] **Set & Use Variables** → Send → check logs for variable extraction
- [ ] **Test Assertions** → Send → see passing/failing tests in response
- [ ] **Script Error Handling** → Send → graceful 404 handling
- [ ] **Chained Request** → Send → uses variables from previous

## Workflows (Demo profile)

- [ ] **Environment Variables** → Send → resolves `{{baseUrl}}` and `{{apiKey}}`
- [ ] **Extract from Response** → Send → variables extracted
- [ ] **Chained (uses extracted)** → Send → uses previous extraction
- [ ] **Dynamic Auth Token** → Send → pre-request script adds auth

## Collections View

- [ ] Click 🌐 REST APIs → 6 requests listed
- [ ] Click any request → detail panel shows on right
- [ ] Detail shows: method, URL, headers, params, body, scripts
- [ ] Click "Open in Builder" → loads request in builder
- [ ] Click back arrow → returns to request list
- [ ] Click "Run" → collection runner executes all requests
- [ ] Runner shows: pass/fail counts, timing per request, runtime variables
- [ ] Stop button halts execution

## Compare Responses

- [ ] Run REST APIs collection (all 5 get 200)
- [ ] Click a request with response → see "Last Response" status
- [ ] "Compare with" dropdown shows other requests
- [ ] Select one → opens Diff view with both responses

## Protocols

- [ ] WebSocket → connect `wss://echo.websocket.org` → send → echo
- [ ] Events auto-scroll (no toggle visible)
- [ ] SSE → connect → events stream in → auto-scroll
- [ ] Socket.IO → connect → emit → response
- [ ] GraphQL → `{ __typename }` → send → response

## AI Assistant

- [ ] Settings → AI → paste OpenRouter key → "Test Key" → "✓ valid"
- [ ] Search models in list → find one
- [ ] Select primary model
- [ ] Add fallback model → reorder with ↑↓ → remove with ✕
- [ ] Save → reload → settings persisted
- [ ] Send request → AI Analysis tab → "What's wrong?" → analysis shows
- [ ] "Explain response" → gets plain English explanation
- [ ] "Fix it" → gets specific fix suggestion
- [ ] "cURL" → generates copy-pasteable command
- [ ] "Test script" → generates pm.test() assertions

## Environments

- [ ] Settings → Environments → see Dev, Prod, Testing
- [ ] Dev is active → has baseUrl, apiKey, userId
- [ ] Switch to Prod → variables change
- [ ] Create new env → add variable → set active

## Collection Runner

- [ ] Click collection → click "Run"
- [ ] Requests execute sequentially
- [ ] See ✓/✗ per request with status, time, size
- [ ] Runtime variables extracted and displayed
- [ ] Delay between requests configurable

## Import

- [ ] Settings → Import → paste Postman JSON → Import
- [ ] Collections appear in sidebar
- [ ] Paste cURL command → Import → request appears
- [ ] Paste OpenAPI spec → Import → endpoints appear

## GitHub Sync

- [ ] Settings → Sync → "Create GitHub Token" opens GitHub
- [ ] Paste PAT → Connect → "Connected as @username"
- [ ] Set repo name → Save
- [ ] Push → "Successfully pushed"
- [ ] Open GitHub → file exists
- [ ] Pull → "Successfully pulled"

## Mock Server

- [ ] Mocks → Create server → Add endpoint
- [ ] Set path `/api/test`, method GET, status 200, body `{"ok":true}`
- [ ] Click "Generate Script" → downloads `mock-server.js`
- [ ] Run `node mock-server.js 3100` → server starts
- [ ] Hit `http://localhost:3100/api/test` → returns `{"ok":true}`

## API Docs

- [ ] Docs → Select collection → choose format
- [ ] "Generate Documentation" → preview shows
- [ ] "Export" → file downloads
- [ ] "Copy" → clipboard gets content
- [ ] OpenAPI 3.0 output is valid JSON

## Keyboard

- [ ] `?` → shortcuts modal → Escape closes (not click-away)
- [ ] Ctrl+Enter sends request from builder view
- [ ] Ctrl+N opens new request

## Sidebar

- [ ] Chevron click → sidebar collapses to icons
- [ ] Logo not squished when collapsed
- [ ] `?` visible in collapsed state → navigates to Settings
- [ ] Chevron click again → expands with labels
- [ ] Scrollable when nav overflows

## Overview (default view)

- [ ] Stats: Total/Success/Errors (click to filter)
- [ ] Capture toggle on/off
- [ ] Quick actions: + New Request, WebSocket, GraphQL, Collections, Settings
- [ ] AI nudge shows when no key configured → "Set up AI" button works
- [ ] Recent requests → click → History
- [ ] Clear All

## History View

- [ ] Requests appear as you browse
- [ ] Search by URL fragment
- [ ] Select multiple → delete
- [ ] Select multiple → export
- [ ] Click request → detail shows headers, body, timing
- [ ] "Open in Builder" loads request URL/method into builder

---

**881 auto tests pass. ~65 manual items. Every feature above has a demo request you can use.**
