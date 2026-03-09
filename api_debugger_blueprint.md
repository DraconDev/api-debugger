# API Debugger Blueprint

## 1. Product thesis

Build a browser-first API debugging product that helps users understand, fix, replay, and automate broken requests faster than generic API clients.

The core wedge is not “another Postman.”
It is:

**Understand why this request failed, right where the failure happens.**

The product should feel like:
- a browser-native request inspector
- an AI-powered failure explainer
- an auth/session/cookie debugger
- a bridge between browser traffic and deeper local/network tooling

The product should start as a **browser extension** and grow into a stack:
- **Website** for onboarding, auth, docs, billing, sync
- **Extension** for in-browser workflow and discovery
- **Local binary** for advanced capabilities the browser cannot do cleanly

---

## 2. Positioning

### What it is
An API debugger that lives close to real browser traffic and helps users:
- inspect requests
- understand failures
- replay requests
- fix auth/header/body issues
- bridge browser-side debugging with local/private-network testing

### What it is not
- not a full generic API platform on day one
- not a replacement for all of Postman/Insomnia on day one
- not a desktop-first API workbench
- not a team collaboration suite first

### Market-facing promise
- See the request
- Understand the failure
- Fix it fast
- Replay it with confidence

### Strong one-line positioning options
- Debug broken API requests in your browser
- Understand failed requests instantly
- The fastest way to diagnose API failures
- AI-powered request debugging for the browser

---

## 3. Ideal users

### Primary users
1. **Frontend developers**
   - dealing with auth, cookies, CORS, headers, request bodies, browser quirks
2. **Full-stack developers**
   - debugging requests across browser, backend, localhost, staging, private APIs
3. **QA / test engineers**
   - validating endpoint behavior and reproducing failed flows
4. **Technical founders / indie hackers**
   - need a faster, lighter tool than a large desktop client

### Secondary users
1. **Support / solutions engineers**
2. **API integrators**
3. **Security-conscious internal tool users**
4. **AI builder users who want rapid request insight**

### Users to ignore early
- enterprise procurement-heavy teams
- users who mainly want advanced collaboration governance
- users who need massive collections/workspaces first
- users who want the broadest multi-protocol platform before the core debugging wedge is great

---

## 4. Core problem statement

Current tools have several issues:
- too generic
- too detached from the browser context
- too heavy
- too much manual setup before value
- too weak at explaining why something failed
- awkward for auth/cookie/session/debugging problems that begin in the browser

Users do not actually want “an API client.”
They want to answer questions like:
- Why did this request fail?
- What changed between the working and broken call?
- Is this auth, cookies, headers, CSRF, CORS, token expiration, payload shape, or environment mismatch?
- Can I replay the real request with a small modification?
- Can I export this into a repeatable test or automation?

That means the product must optimize for:
- speed to first insight
- contextual debugging
- clear diffing
- AI explanation only when useful
- replayability

---

## 5. Product goals

### Primary goals
- Become the fastest way to understand broken requests in the browser
- Make replaying and modifying real captured requests trivial
- Use AI to reduce debugging time, not to add fluff
- Provide a path from browser debugging to deeper local/private-network work

### Secondary goals
- Build a lightweight alternative entry point to heavier API clients
- Create a monetizable browser-native tool with optional local power
- Create a shared engine that can later support more surfaces

### Non-goals for v1
- replacing all enterprise API platforms
- full Postman parity
- native desktop app
- massive team collaboration layer
- huge protocol surface on day one

---

## 6. Product architecture

### Surface model

#### A. Website
Responsibilities:
- landing page
- docs
- pricing
- auth/account
- billing
- cloud sync
- changelog
- onboarding

#### B. Browser extension
Responsibilities:
- request capture / inspection in browser context
- request detail view
- replay UI for supported cases
- AI explanation UI
- auth/session/cookie-focused helpers
- browser-adjacent debugging workflows
- extension settings
- optional connection to local binary

#### C. Local binary
Responsibilities:
- local/private network access
- localhost testing
- gRPC / WebSocket / advanced protocol support later
- local file import/export
- proxy/helper behavior
- secure bridge between extension and deeper local capabilities
- optional TUI or CLI mode

### High-level principle
Build **one core engine** with multiple surfaces.
Do not build three separate products.

---

## 7. MVP scope

### The MVP promise
Capture a request from the browser, inspect it clearly, explain why it failed, modify it, and replay it.

### MVP feature set

#### 1. Browser request capture
- capture relevant HTTP/HTTPS requests from browser context
- filter by domain, method, status, content type
- view request timeline/history
- group by tab/session

#### 2. Request detail view
For each request:
- method
- URL
- query params
- headers
- cookies where available/relevant
- body / payload
- status code
- response headers
- response body preview
- timing info
- initiator / source page context where possible

#### 3. Failure explanation
AI + rules-based hybrid explanation for:
- 401 / 403 auth errors
- missing / expired token
- CSRF/session mismatch
- CORS issues
- malformed JSON / body mismatch
- content-type mismatch
- missing required headers
- probable schema mismatch
- environment mismatch
- rate limiting hints
- suspicious redirect/auth flow problems

#### 4. Request replay
- resend captured request
- edit headers/body/query
- save variants
- compare original vs replay
- show diff in result

#### 5. Request diffing
- compare two requests
- compare request + replay
- compare two responses
- highlight changes in:
  - URL
  - headers
  - body
  - auth
  - cookies
  - status

#### 6. Collections / saved cases
- save important requests
- tag them
- favorite them
- organize into simple folders/collections

#### 7. Share/export basics
- copy as curl
- copy as fetch
- export request JSON
- import request JSON

#### 8. Accounts / sync
- sign in
- sync saved requests, collections, settings
- no enterprise complexity in v1

### Optional MVP+ via local binary
- localhost replay
- access to private dev endpoints
- better handling of non-browser-accessible targets

---

## 8. User journeys

### Journey 1: Debugging a broken frontend call
1. User installs extension
2. User opens app/site they are debugging
3. Extension shows recent requests
4. User filters failed requests
5. User opens one failed request
6. Product explains likely cause
7. User edits token/header/body
8. User replays request
9. User sees success or new error
10. User saves working version

### Journey 2: Reproduce a real request in dev workflow
1. User captures real browser request
2. User exports as curl/fetch
3. User opens details in extension
4. User optionally sends to local binary for localhost/private replay
5. User iterates until fixed

### Journey 3: Diagnose auth issues
1. User sees repeated 401/403 failures
2. Product surfaces auth-focused diagnostics
3. Product points out missing/expired headers/cookies/session mismatch
4. User compares working vs failed request
5. User replays corrected request

### Journey 4: Save useful flows
1. User captures several requests from a flow
2. Saves them into a collection
3. Labels them by project/environment
4. Reuses them later

---

## 9. UX principles

### Core UX rules
- show the actual request first
- keep AI secondary to evidence
- do not bury users in generic dashboards
- prioritize directness and speed
- make diffs visually obvious
- make replay effortless
- keep the extension lightweight and focused

### UI priorities
1. Failed requests first
2. Clear status / timing / auth signals
3. Request vs replay comparison
4. Quick AI diagnosis
5. Easy export

### UX anti-patterns to avoid
- too many empty dashboards
- too much collaboration scaffolding in v1
- chat-first interface replacing actual inspection
- AI explanations without evidence anchors
- giant enterprise complexity before single-user delight

---

## 10. AI system design

### AI role
AI should help answer:
- what probably went wrong?
- what changed?
- what should I try next?

AI should not be the only source of truth.
The system should combine:
- rules-based diagnostics
- structured heuristics
- AI explanation layer

### Recommended AI flow
1. Parse request/response structure
2. Run deterministic checks
3. Build structured diagnostic summary
4. Ask model for human-readable explanation + ranked hypotheses
5. Present explanation with evidence references

### Example output structure
- **Most likely issue**
- **Evidence**
- **Other possible causes**
- **Recommended next edit**
- **Risk / uncertainty**

### AI guardrails
- never invent observed headers or response fields
- label speculation clearly
- prefer “likely” over false confidence
- show raw evidence alongside explanation
- keep token/secret handling safe

### Monetization role of AI
AI explanation is a strong premium feature, but basic inspection must be useful without it.

---

## 11. Local binary blueprint

### Purpose
The local binary exists to unlock what browser-only architecture cannot do cleanly.

### Modes
- `apidbg login`
- `apidbg doctor`
- `apidbg serve`
- `apidbg replay`
- `apidbg export`
- optional `apidbg tui`

### Core capabilities
- localhost/private network access
- optional proxy mode
- advanced replay
- certificate/local networking support where appropriate
- larger imports/exports
- future protocol expansion

### Connection models
Option A:
- extension talks to binary through native messaging

Option B:
- binary hosts localhost HTTP/WebSocket API
- extension connects locally

### Recommendation
Start with localhost service model for simplicity and debuggability unless native messaging gives a decisive advantage.

### Binary design principles
- one binary
- explicit commands
- no special terminal required
- no custom terminal replacement
- minimal setup
- clear error messages

---

## 12. Data model

### Core entities
- User
- Workspace (simple initially)
- Project
- Request
- Response snapshot
- Replay attempt
- Collection
- Environment
- Diagnostic result
- AI explanation
- Local agent connection

### Request record fields
- id
- timestamp
- project/workspace id
- source tab/domain
- method
- URL
- query params
- headers
- cookies metadata where appropriate
- request body
- response status
- response headers
- response body preview
- timing
- tags
- saved/favorited flag

### Replay fields
- original request id
- modified request snapshot
- replay timestamp
- replay environment
- replay result
- diff summary

---

## 13. Technical architecture

### Frontend
- React
- TypeScript
- Vite or similar build setup
- extension UI optimized for popup + full-page panel / side panel view

### Backend / cloud
- auth service
- billing service
- sync/store API
- AI proxy/orchestration service
- analytics/events pipeline

### Storage
Cloud:
- user/account/settings/saved collections/diagnostic history

Local:
- recent captured requests
- unsynced drafts
- ephemeral request bodies where privacy requires local-only treatment

### Security principles
- secrets handling must be explicit
- give user control over sync vs local-only data
- sensitive payload retention must be configurable
- minimize unnecessary cloud transmission
- AI requests should redact or mask sensitive values where possible

---

## 14. Monetization

### Free tier
- request capture
- basic inspection
- limited saved history
- basic replay
- export to curl/fetch
- limited AI explanations per month

### Pro tier
- unlimited AI diagnostics
- advanced diffing
- longer history
- collections/workspaces
- local binary integration features
- localhost/private replay
- environment management
- advanced exports/imports

### Team tier later
- shared collections
- annotations
- audit trail
- shared environments
- role controls

### Important monetization principle
Do not paywall the core visibility so hard that the product feels useless.
Charge for speed, depth, automation, and scale.

---

## 15. Differentiation

### Against Postman / Insomnia
You win by being:
- lighter
- browser-native
- better at real request debugging
- stronger at explain/fix flows
- faster to first insight

### Against Thunder Client / IDE tools
You win by being:
- closer to real browser traffic
- better at auth/session/browser weirdness
- stronger at browser-context debugging

### Against simple API testers
You win by being:
- diagnosis-first
- replay-friendly
- AI-assisted
- context-rich

### Main wedge
**Not “another API client.”**
**A browser-native API debugger.**

---

## 16. Go-to-market

### Acquisition channels
- Chrome Web Store
- Edge add-ons
- SEO pages for common errors
- YouTube/X/dev content
- Reddit/Hacker News/dev communities
- docs pages around auth/CORS/debugging

### SEO wedge examples
- debug 401 api request in browser
- why fetch request fails with 403
- how to inspect auth headers in browser
- replay browser request as curl
- diagnose CORS/auth/cookie issues

### Product-led hooks
- install extension
- inspect failed requests immediately
- copy as curl/fetch
- click AI explain

### Content strategy
Create high-signal content around:
- auth debugging
- cookie/session issues
- CORS confusion
- request replay tips
- comparing browser request vs curl behavior

---

## 17. Metrics

### Activation metrics
- extension install to first captured request
- first failed request viewed
- first replay
- first AI explanation
- first saved collection

### Retention metrics
- weekly active debuggers
- replay usage frequency
- saved collections reused
- repeat AI diagnosis usage

### Monetization metrics
- free to pro conversion
- AI explanation conversion events
- local binary adoption by paying users
- retention by plan

### Quality metrics
- AI explanation helpfulness rating
- replay success rate
- diagnostic accuracy feedback
- false-confidence rate in AI outputs

---

## 18. Build order

### Phase 1: wedge MVP
- extension shell
- capture/history
- request detail view
- basic replay
- diffing basics
- limited AI explanation
- website + auth + simple billing

### Phase 2: depth
- collections
- environments
- better auth diagnostics
- export/import improvements
- local binary integration

### Phase 3: advanced capability
- localhost/private replay
- more protocols
- better automation/testing flows
- team features if justified

### Phase 4: broader platform options
- IDE integration
- advanced agent workflows
- optional localhost web UI
- optional desktop only if strongly justified

---

## 19. Key product risks

### Risk 1: Becoming “small Postman”
Mitigation:
- stay focused on debugging wedge
- do not chase broad parity too early

### Risk 2: AI feels gimmicky
Mitigation:
- anchor AI in deterministic evidence
- keep raw data primary

### Risk 3: Browser limits block deeper use cases
Mitigation:
- design in the local binary path early

### Risk 4: Too much surface area
Mitigation:
- one shared engine
- extension first, everything else thin

### Risk 5: Weak differentiation
Mitigation:
- own the browser-native debugging story
- own the auth/session/failure explanation story

---

## 20. Final product statement

Build a browser-first API debugger that captures real requests, explains failures, lets users replay and fix them quickly, and expands through a local binary for deeper power.

The product should be:
- lighter than desktop incumbents
- more contextual than generic API clients
- more useful than shallow browser API testers
- more actionable than AI chat wrappers

The winning structure is:
- **Website for ownership**
- **Extension for discovery and workflow**
- **Local binary for power**

And the winning wedge is:

**Help users understand and fix broken API requests faster than any generic client.**

