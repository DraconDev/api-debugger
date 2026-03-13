# API Debugger - Complete Development Roadmap

## Vision

Build the **best browser-first API debugging tool** that:
- Requires no account
- Works offline
- Respects privacy (BYOK AI, local storage)
- Leverages browser capabilities
- Optionally extends via CLI for advanced protocols

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Debugger Extension                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Popup   │  │Dashboard│  │DevTools │  │Background│            │
│  │ (Quick) │  │ (Full)  │  │ (Panel) │  │ (Worker) │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              │   Chrome Storage    │                            │
│              │  (sync + local)     │                            │
│              └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Native Messaging (optional)
                          ▼
              ┌─────────────────────────┐
              │   API Debugger CLI      │
              │   (Optional Addon)      │
              │  - gRPC support         │
              │  - Proto parsing        │
              │  - Advanced protocols   │
              └─────────────────────────┘
```

---

## Phase 1: Critical Missing Features (v0.2.0)

### 1.1 Import Formats ⚠️ CRITICAL

**Problem:** Users can't migrate from other tools

| Format | Priority | Effort | Dependencies |
|--------|----------|--------|--------------|
| OpenAPI 3.0 JSON | Critical | Medium | - |
| OpenAPI 3.0 YAML | Critical | Medium | js-yaml |
| OpenAPI 3.1 | High | Medium | - |
| Postman Collection v2.1 | Critical | Medium | - |
| Postman Collection v2.0 | High | Low | - |
| Postman Environment | High | Low | - |
| HAR (HTTP Archive) | Medium | Low | - |
| Insomnia Export v4 | Medium | Medium | - |
| Bruno Collection | Low | Medium | - |
| Paw Collection | Low | Medium | - |
| REST Client (.rest) | Low | Low | - |
| cURL (parse & import) | Medium | Low | - |

**Implementation Plan:**
```
lib/importers/
  index.ts              # Router, detect format, delegate
  openapi.ts            # OpenAPI 3.x parser
  postman.ts            # Postman v2.x parser
  har.ts                # HAR parser
  insomnia.ts           # Insomnia export parser
  curl.ts               # cURL command parser
  types.ts              # Shared import types
  utils.ts              # Common utilities
```

**Import Flow:**
```
User drops file/clicks import
    ↓
Detect format (extension, content)
    ↓
Parse file
    ↓
Convert to internal format
    ├── Collections
    ├── Environments
    └── Saved Requests
    ↓
Show preview
    ↓
User confirms → Save to storage
```

### 1.2 Export Formats

| Format | Priority | Effort |
|--------|----------|--------|
| JSON (current) | ✅ Done | - |
| Postman Collection v2.1 | High | Low |
| Postman Collection v2.0 | Medium | Low |
| OpenAPI 3.0 | ✅ Done | - |
| OpenAPI 3.1 | Medium | Medium |
| HAR | Medium | Low |
| Bruno Collection | Low | Medium |
| Insomnia Export | Low | Medium |

### 1.3 Response Viewer Improvements ⚠️ HIGH

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| JSON folding/collapsing | Critical | Medium | Essential UX |
| JSON path search | High | Medium | Filter by JSONPath |
| JSONPath query | Medium | Medium | $.data.users[*].name |
| Response search (Ctrl+F) | Critical | Low | Basic find |
| Copy path/value | High | Low | Right-click on node |
| Copy JSON path | Medium | Low | $.data.items[0].id |
| Line numbers | Medium | Low | For raw view |
| Large response handling | High | Medium | Virtual scrolling |
| XML syntax highlighting | Medium | Low | Tree-sitter or regex |
| XML folding | Medium | Medium | Similar to JSON |
| HTML preview | Medium | Low | iframe sandbox |
| Image preview | Low | Low | Detect content-type |
| Video/Audio preview | Low | Low | HTML5 elements |
| PDF preview | Low | Medium | PDF.js |
| Base64 decode view | Low | Low | For binary in JSON |
| Hex viewer | Low | Medium | For binary responses |

**JSON Viewer Implementation:**
```
components/response/
  JsonViewer.tsx        # Main component with folding
  JsonNode.tsx          # Individual node renderer
  JsonSearch.tsx        # Search within JSON
  JsonPathBar.tsx       # Show current path
  CopyButton.tsx        # Copy value/path
```

---

## Phase 2: UX Polish (v0.2.0)

### 2.1 Onboarding

| Feature | Priority | Effort |
|---------|----------|--------|
| Welcome modal on first launch | Critical | Low |
| Sample collections | Critical | Low |
| Guided tour | Medium | Medium |
| Feature discovery tooltips | Medium | Low |
| "What's new" modal | Low | Low |

**Sample Collections:**
```javascript
const sampleCollections = [
  {
    name: "REST API Examples",
    requests: [
      { name: "Get Users", method: "GET", url: "https://jsonplaceholder.typicode.com/users" },
      { name: "Create User", method: "POST", url: "...", body: {...} },
    ]
  },
  {
    name: "GraphQL Examples",
    requests: [...]
  },
  {
    name: "WebSocket Examples",
    requests: [...]
  }
];
```

### 2.2 Request Builder Improvements

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Header autocomplete | Critical | Low | Common headers list |
| Header value autocomplete | Medium | Medium | Content-Type values, etc. |
| Header presets | High | Low | CORS, Auth, Content-Type |
| URL autocomplete | Medium | Medium | From history |
| URL params from URL | High | Low | Parse ?key=value |
| Bulk edit headers | Medium | Low | Raw text area |
| Bulk edit params | Medium | Low | Raw text area |
| Save button in builder | Critical | Low | Quick save request |
| Duplicate request | High | Low | Copy current request |
| Request comments | Low | Low | Add notes to requests |
| Request tags | Low | Medium | Label/tag requests |
| Variable picker | Medium | Medium | UI to select {{var}} |

**Header Autocomplete Data:**
```javascript
const COMMON_HEADERS = [
  "Accept", "Accept-Encoding", "Accept-Language", "Authorization",
  "Cache-Control", "Content-Type", "Cookie", "Date", "ETag",
  "Host", "If-Modified-Since", "If-None-Match", "Origin",
  "Referer", "User-Agent", "X-Requested-With", // ...
];

const CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
  "text/html",
  "text/xml",
];
```

### 2.3 Keyboard Shortcuts ⚠️ HIGH

| Shortcut | Action | Context | Priority |
|----------|--------|---------|----------|
| Ctrl/Cmd + Enter | Send request | Builder | Critical |
| Ctrl/Cmd + S | Save request | Builder | Critical |
| Ctrl/Cmd + Shift + S | Save as... | Builder | High |
| Ctrl/Cmd + N | New request | Global | High |
| Ctrl/Cmd + O | Open collection | Global | Medium |
| Ctrl/Cmd + P | Quick open | Global | Medium |
| Ctrl/Cmd + F | Search | Context | High |
| Ctrl/Cmd + G | Search in response | Response | Medium |
| Ctrl/Cmd + Shift + K | Clear history | History | Low |
| Escape | Cancel request | Request | Critical |
| Escape | Close modal | Modal | Critical |
| Ctrl/Cmd + 1-9 | Switch tab | Tab bar | Medium |
| Ctrl/Cmd + W | Close tab | Tab bar | Medium |
| ? | Show shortcuts | Global | High |
| Ctrl/Cmd + K | Command palette | Global | Medium |
| Ctrl/Cmd + L | Focus URL | Builder | Medium |
| Ctrl/Cmd + I | Focus request body | Builder | Medium |
| Tab | Next field | Forms | Critical |
| Shift + Tab | Previous field | Forms | Critical |

**Implementation:**
```
hooks/useKeyboardShortcuts.ts
lib/shortcuts.ts
components/ShortcutsModal.tsx
components/CommandPalette.tsx
```

### 2.4 Collections Management

| Feature | Priority | Effort |
|---------|----------|--------|
| Drag-drop reorder requests | High | Medium |
| Drag-drop reorder collections | High | Medium |
| Nested folders (unlimited) | High | Medium |
| Search within collection | High | Low |
| Bulk select/delete | Medium | Low |
| Duplicate collection | Medium | Low |
| Export single collection | High | Low |
| Import to existing collection | Medium | Low |
| Collection description | Low | Low |
| Collection variables | Medium | Medium |
| Folder-level variables | Low | Medium |
| Request ordering | Medium | Low |
| Sort alphabetically | Low | Low |
| Filter by method | Low | Low |
| Filter by tag | Low | Medium |

---

## Phase 3: Testing & Automation (v0.3.0)

### 3.1 Test Improvements

| Feature | Priority | Effort |
|---------|----------|--------|
| Test snippets library | Critical | Low |
| Visual test builder | Medium | High |
| Test results dashboard | High | Medium |
| Test history | Medium | Low |
| Assertion helpers | High | Low |
| Schema validation | Medium | Medium |
| JSON Schema validation | Medium | Medium |
| Response time assertions | High | Low |
| Custom assertion functions | Low | Medium |
| Test coverage report | Low | Medium |

**Test Snippets:**
```javascript
const testSnippets = [
  { 
    name: "Status is 200", 
    code: `pm.test("Status is 200", () => {
  pm.expect(pm.response.status).to.equal(200);
});` 
  },
  { 
    name: "Status is 2xx", 
    code: `pm.test("Status is 2xx", () => {
  pm.expect(pm.response.status).to.be.within(200, 299);
});` 
  },
  { 
    name: "Response time < 200ms", 
    code: `pm.test("Response time < 200ms", () => {
  pm.expect(pm.response.duration).to.be.below(200);
});` 
  },
  { 
    name: "Has JSON body", 
    code: `pm.test("Response is JSON", () => {
  pm.expect(() => JSON.parse(pm.response.body)).to.not.throw();
});` 
  },
  { 
    name: "JSON has field", 
    code: `pm.test("Has data field", () => {
  const json = JSON.parse(pm.response.body);
  pm.expect(json).to.have.property("data");
});` 
  },
  { 
    name: "JSON array not empty", 
    code: `pm.test("Array is not empty", () => {
  const json = JSON.parse(pm.response.body);
  pm.expect(json).to.be.an("array").that.is.not.empty;
});` 
  },
  // ... 20+ more snippets
];
```

### 3.2 Collection Runner Improvements

| Feature | Priority | Effort |
|---------|----------|--------|
| Run selected requests | High | Low |
| Stop on first failure | High | Low |
| Retry failed requests | Medium | Medium |
| Run in parallel | Medium | Medium |
| Progress indicator | High | Low |
| Detailed results view | High | Medium |
| Export results | Medium | Low |
| Schedule runs | Low | Medium |
| Compare runs | Low | Medium |

---

## Phase 4: Performance Testing (v0.4.0)

### 4.1 Load Testing (Browser-Based)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Concurrent requests | High | Medium | Promise.all batching |
| Configure iterations | High | Low | How many requests |
| Configure concurrency | High | Low | How many parallel |
| Measure avg/min/max | High | Low | Basic stats |
| Calculate p95/p99 | Medium | Low | Percentiles |
| Response time chart | High | Medium | Line chart |
| Response time distribution | Medium | Medium | Histogram |
| Error rate tracking | High | Low | Track failures |
| Export results (CSV/JSON) | Medium | Low | Download |
| Compare load tests | Low | Medium | Side by side |
| Save load test config | Medium | Low | Presets |

**Implementation:**
```typescript
// lib/loadTest.ts
interface LoadTestConfig {
  request: RequestConfig;
  iterations: number;
  concurrency: number;
  delay: number; // between batches
}

interface LoadTestResult {
  totalDuration: number;
  requests: number;
  successful: number;
  failed: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errors: ErrorSummary[];
  timeline: TimelinePoint[];
}

async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const results: RequestResult[] = [];
  
  for (let i = 0; i < config.iterations; i += config.concurrency) {
    const batch = Math.min(config.concurrency, config.iterations - i);
    const batchResults = await Promise.all(
      Array(batch).fill(null).map(() => sendRequest(config.request))
    );
    results.push(...batchResults);
    
    if (config.delay > 0) {
      await sleep(config.delay);
    }
  }
  
  return calculateStats(results);
}
```

### 4.2 Performance Dashboard

| Feature | Priority | Effort |
|---------|----------|--------|
| Response time graph | High | Medium |
| Success/failure pie chart | Medium | Low |
| Timeline view | Medium | Medium |
| Compare multiple tests | Low | Medium |
| Export as PDF | Low | Medium |

---

## Phase 5: API Monitoring (v0.4.0)

### 5.1 Scheduled Monitoring

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Schedule via alarms API | High | Medium | Chrome limitation |
| Minimum 1 minute interval | N/A | N/A | Chrome alarm limit |
| Configure schedule | High | Low | Every X minutes |
| Store historical results | High | Medium | Limited by storage |
| Notification on failure | High | Low | Chrome notifications |
| Status badge | Medium | Low | Visual indicator |
| Uptime calculation | Medium | Low | % uptime |
| Response time trends | Medium | Medium | Chart over time |
| Alert thresholds | Medium | Low | Alert if > X ms |
| Export monitoring data | Low | Low | CSV/JSON |

**Implementation:**
```typescript
// background.ts - using alarms API
chrome.alarms.create('monitoring', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'monitoring') {
    const monitors = await getMonitors();
    for (const monitor of monitors) {
      try {
        const response = await sendRequest(monitor.request);
        await storeMonitorResult(monitor.id, response);
        
        if (isFailure(response, monitor.criteria)) {
          showNotification(monitor.name, 'Request failed');
        }
      } catch (error) {
        await storeMonitorError(monitor.id, error);
        showNotification(monitor.name, error.message);
      }
    }
  }
});
```

### 5.2 Monitoring Dashboard

| Feature | Priority | Effort |
|---------|----------|--------|
| Monitor list | High | Low |
| Status indicators | High | Low |
| Recent results | High | Low |
| Response time graph | Medium | Medium |
| Uptime percentage | Medium | Low |
| Configure thresholds | Medium | Low |
| Pause/resume | High | Low |
| Add/edit monitors | High | Low |

---

## Phase 6: Visualization (v0.5.0)

### 6.1 Response Visualization

| Feature | Priority | Effort |
|---------|----------|--------|
| JSON → Table view | High | Medium |
| Auto-detect tabular data | Medium | Medium |
| JSON → Chart (auto) | Medium | High |
| Custom visualizer (HTML) | Low | Medium |
| CSV preview | Medium | Low |
| Markdown preview | Low | Low |
| YAML preview | Low | Low |

**Table View:**
```typescript
// Detect if JSON is array of objects
function isTabularData(json: unknown): boolean {
  return Array.isArray(json) && 
         json.length > 0 && 
         typeof json[0] === 'object' &&
         !Array.isArray(json[0]);
}

// Render as table
<Table data={json} columns={Object.keys(json[0])} />
```

### 6.2 History Visualization

| Feature | Priority | Effort |
|---------|----------|--------|
| Timeline view | Medium | Medium |
| Status code distribution | Medium | Low |
| Domain breakdown | Low | Medium |
| Response time trends | Medium | Medium |
| Heat map (by time of day) | Low | Medium |

---

## Phase 7: Collaboration (v0.5.0)

### 7.1 Git Integration (Our Strength)

| Feature | Priority | Effort |
|---------|----------|--------|
| GitHub sync | ✅ Done | - |
| GitLab sync | Medium | Medium |
| Bitbucket sync | Low | Medium |
| Auto-sync on change | High | Low |
| Manual sync (push/pull) | ✅ Done | - |
| Conflict detection | High | Medium |
| Conflict resolution UI | Medium | High |
| Branch support | Medium | Low |
| Commit message templates | Low | Low |
| View sync history | Medium | Low |
| Rollback to previous sync | Low | Medium |
| Sync specific collections | Low | Medium |

### 7.2 Sharing

| Feature | Priority | Effort |
|---------|----------|--------|
| Export as JSON | ✅ Done | - |
| Export as cURL | ✅ Done | - |
| Export as Postman | High | Low |
| Generate share link | Medium | Medium |
| "Run in API Debugger" button | Medium | Medium |
| Share via GitHub Gist | Low | Medium |
| QR code for mobile | Low | Low |

---

## Phase 8: CLI Extension (v0.6.0) - Optional Addon

### 8.1 CLI Architecture

```
api-debugger-cli/
├── src/
│   ├── main.go              # Entry point
│   ├── native/
│   │   ├── messaging.go     # Native messaging protocol
│   │   └── config.go        # Install manifest
│   ├── grpc/
│   │   ├── client.go        # gRPC client
│   │   ├── proto.go         # Proto parsing
│   │   ├── reflection.go    # gRPC reflection
│   │   └── streaming.go     # Streaming calls
│   ├── mqtt/
│   │   └── client.go        # MQTT over WebSocket
│   └── utils/
│       └── tls.go           # TLS/mTLS support
├── go.mod
├── Makefile
└── install.sh
```

### 8.2 CLI Features

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Native messaging host | Critical | Medium | Talk to extension |
| gRPC unary calls | Critical | Medium | Basic RPC |
| gRPC server streaming | High | Medium | Server → Client |
| gRPC client streaming | Medium | Medium | Client → Server |
| gRPC bidi streaming | Medium | Medium | Both directions |
| Proto file loading | Critical | Medium | Load .proto |
| Proto import resolution | High | Medium | Import paths |
| gRPC reflection | High | Medium | Auto-discover methods |
| TLS/mTLS | Medium | Medium | Certificates |
| JWT/OAuth for gRPC | Medium | Low | Metadata auth |
| MQTT over WS | Low | High | IoT protocols |
| Installation script | Critical | Low | One-command install |
| Auto-configure manifest | Critical | Low | Setup native messaging |

### 8.3 CLI Installation Flow

```
User clicks "Enable gRPC"
    ↓
Extension checks for CLI
    ↓
Not found → Show install options
    ├── npm install -g @api-debugger/cli
    ├── brew install api-debugger/cli
    ├── Download binary (GitHub releases)
    └── Build from source
    ↓
User installs CLI
    ↓
CLI runs setup:
    ├── Detect browser
    ├── Create native messaging manifest
    └── Print success message
    ↓
User refreshes extension
    ↓
gRPC tab becomes active
```

### 8.4 CLI Distribution

| Platform | Format | Command |
|----------|--------|---------|
| macOS | Binary, Homebrew | `brew install api-debugger/cli` |
| Windows | .exe, Scoop, Chocolatey | `scoop install api-debugger` |
| Linux | Binary, Snap, AUR | `snap install api-debugger` |
| npm | Global package | `npm install -g @api-debugger/cli` |
| GitHub | Releases | Download binary |

---

## Phase 9: Developer Experience (v0.6.0)

### 9.1 Code Generation

| Language | Library | Priority |
|----------|---------|----------|
| cURL | - | ✅ Done |
| JavaScript | fetch | ✅ Done |
| JavaScript | axios | High |
| JavaScript | got | Medium |
| TypeScript | fetch | High |
| Python | requests | High |
| Python | httpx | Medium |
| Python | urllib | Low |
| Go | net/http | High |
| Go | req | Low |
| Rust | reqwest | Medium |
| Java | OkHttp | Medium |
| Java | HttpClient | Low |
| Java | Unirest | Low |
| C# | HttpClient | Medium |
| C# | RestSharp | Low |
| Ruby | net/http | Medium |
| Ruby | faraday | Low |
| PHP | curl | Medium |
| PHP | Guzzle | Low |
| Swift | URLSession | Low |
| Kotlin | OkHttp | Low |
| Dart | http | Low |
| Elixir | HTTPoison | Low |
| Shell | wget | Low |
| Shell | httpie | Low |

**Implementation:**
```
lib/codegen/
  index.ts
  javascript/
    fetch.ts
    axios.ts
    got.ts
  python/
    requests.ts
    httpx.ts
  go/
    nethttp.ts
  # ... etc
```

### 9.2 SDK Generation

| Type | Priority | Effort |
|------|----------|--------|
| TypeScript client | Medium | High |
| Python client | Medium | High |
| OpenAPI spec → SDK | Medium | High |

---

## Phase 10: Advanced Features (v0.7.0+)

### 10.1 Environment Management

| Feature | Priority | Effort |
|---------|----------|--------|
| Multiple environments | ✅ Done | - |
| Environment switcher | ✅ Done | - |
| Environment templates | Medium | Low |
| Environment variables UI | High | Medium |
| Secret variables (masked) | High | Low |
| Environment import/export | Medium | Low |
| Per-request environment | Low | Medium |
| Environment inheritance | Low | Medium |

### 10.2 Variable System

| Feature | Priority | Effort |
|---------|----------|--------|
| {{variable}} syntax | ✅ Done | - |
| Dynamic variables | High | Low |
| {{$guid}} | Medium | Low |
| {{$timestamp}} | Medium | Low |
| {{$randomInt}} | Medium | Low |
| {{$randomName}} | Low | Low |
| {{$randomEmail}} | Low | Low |
| Custom functions | Low | Medium |
| Variable scopes | Medium | Medium |

### 10.3 Advanced Mock Server

| Feature | Priority | Effort |
|---------|----------|--------|
| Path parameters | High | Medium |
| Query parameters | High | Low |
| Request matching | Medium | Medium |
| Dynamic responses | Medium | Medium |
| Response delays | High | Low |
| Rate limiting | Low | Medium |
| Proxy mode | Low | Medium |
| Record & replay | Low | High |

### 10.4 API Documentation

| Feature | Priority | Effort |
|---------|----------|--------|
| Markdown docs | ✅ Done | - |
| HTML docs | ✅ Done | - |
| OpenAPI generation | ✅ Done | - |
| Interactive docs | Medium | High |
| Auto-generate from requests | Medium | Medium |
| Documentation hosting | Low | High |

---

## Quick Wins (Do First)

### Session 1 (Next)
1. ✅ Header autocomplete
2. ✅ Keyboard shortcuts
3. ✅ Welcome screen + samples
4. ✅ Save button in builder
5. ✅ JSON folding in response

### Session 2
1. ⬜ OpenAPI import
2. ⬜ Postman collection import
3. ⬜ cURL import
4. ⬜ HAR import

### Session 3
1. ⬜ JSON search in response
2. ⬜ Copy path/value
3. ⬜ Test snippets library
4. ⬜ Command palette

### Session 4
1. ⬜ Load testing
2. ⬜ CLI scaffolding
3. ⬜ Native messaging setup

---

## Version Milestones

| Version | Release | Focus |
|---------|---------|-------|
| 0.1.x | Current | Core features |
| 0.2.0 | Soon | Import/Export, UX Polish |
| 0.3.0 | Q2 2025 | Testing, Snippets |
| 0.4.0 | Q3 2025 | Performance, Monitoring |
| 0.5.0 | Q4 2025 | Visualization, Collaboration |
| 0.6.0 | Q1 2026 | CLI Extension |
| 1.0.0 | 2026 | Polish, Stability |

---

## Metrics & Success

| Metric | Target |
|--------|--------|
| Chrome Store rating | > 4.5 stars |
| Weekly active users | Track growth |
| Import success rate | > 95% |
| First request time | < 30 seconds |
| Feature adoption | Track per feature |
| Error rate | < 1% |

---

## What We're NOT Building

| Feature | Reason |
|---------|--------|
| Cloud backend | Privacy-first |
| User accounts | Privacy-first |
| Team chat | Out of scope |
| Real-time collab | Use Git instead |
| CI/CD integration | Extension-only |
| Mobile app | Extension-only |
| Desktop app | Extension-only |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## License

MIT
