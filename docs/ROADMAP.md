# API Debugger - Development Roadmap

## Philosophy

We are a **browser extension first**. Every feature must work within browser constraints:
- No backend servers
- No CLI required
- Everything local-first
- BYOK for AI
- Git for collaboration

---

## Phase 1: Critical Gaps (High Priority)

### 1.1 Import Formats
| Format | Status | Effort |
|--------|--------|--------|
| OpenAPI 3.0 (JSON) | ❌ | Medium |
| OpenAPI 3.0 (YAML) | ❌ | Medium |
| Postman Collection v2.1 | ❌ | Medium |
| Postman Collection v2.0 | ❌ | Medium |
| HAR (HTTP Archive) | ❌ | Low |
| Insomnia Export | ❌ | Medium |
| Bruno Collection | ❌ | Medium |

**Implementation:**
```
lib/importers/
  openapi.ts      # Parse OpenAPI spec -> Collections
  postman.ts      # Parse Postman export -> Collections
  har.ts          # Parse HAR -> History
  insomnia.ts     # Parse Insomnia export
  bruno.ts        # Parse Bruno collection
```

### 1.2 Response Viewer Improvements
| Feature | Status | Effort |
|---------|--------|--------|
| JSON folding/collapsing | ❌ | Medium |
| JSON path search | ❌ | Medium |
| JSONPath/JSON Query | ❌ | Medium |
| XML syntax highlighting | ❌ | Low |
| XML folding | ❌ | Medium |
| HTML preview | ❌ | Low |
| Image preview | ❌ | Low |
| Response search (Ctrl+F) | ❌ | Low |
| Line numbers | ❌ | Low |
| Copy path/value | ❌ | Low |
| Large response pagination | ❌ | Medium |

### 1.3 Onboarding
| Feature | Status | Effort |
|---------|--------|--------|
| Welcome screen on first launch | ❌ | Low |
| Sample collections (REST, GraphQL, etc.) | ❌ | Low |
| Guided tour / walkthrough | ❌ | Medium |
| Keyboard shortcuts cheat sheet | ❌ | Low |

---

## Phase 2: UX Polish (Medium Priority)

### 2.1 Request Builder
| Feature | Status | Effort |
|---------|--------|--------|
| Header autocomplete (common headers) | ❌ | Low |
| Header presets (CORS, Auth, etc.) | ❌ | Low |
| Bulk edit mode (raw headers) | ❌ | Low |
| URL autocomplete from history | ❌ | Medium |
| Method color coding | ✅ | Done |
| Save as new request button | ❌ | Low |
| Duplicate request | ❌ | Low |

### 2.2 Keyboard Shortcuts
| Shortcut | Action | Status |
|----------|--------|--------|
| Ctrl/Cmd + Enter | Send request | ❌ |
| Ctrl/Cmd + S | Save request | ❌ |
| Ctrl/Cmd + Shift + S | Save as... | ❌ |
| Ctrl/Cmd + N | New request | ❌ |
| Ctrl/Cmd + W | Close tab | ❌ |
| Ctrl/Cmd + 1-9 | Switch tabs | ❌ |
| Ctrl/Cmd + F | Search (context-aware) | ❌ |
| Escape | Cancel request | ❌ |
| ? | Show shortcuts | ❌ |
| Ctrl/Cmd + K | Command palette | ❌ |

### 2.3 Collections Management
| Feature | Status | Effort |
|---------|--------|--------|
| Drag-drop reorder | ❌ | Medium |
| Nested folders (unlimited depth) | ❌ | Medium |
| Search within collections | ❌ | Low |
| Tags/labels for requests | ❌ | Low |
| Duplicate collection | ❌ | Low |
| Export single collection | ❌ | Low |
| Share collection link | ❌ | Medium |

### 2.4 History Improvements
| Feature | Status | Effort |
|---------|--------|--------|
| Group by domain | ❌ | Medium |
| Group by session (time) | ❌ | Medium |
| Filter by status code | ❌ | Low |
| Filter by method | ❌ | Low |
| "Replay all failed" | ❌ | Low |
| Advanced search | ❌ | Medium |
| Export filtered history | ❌ | Low |

---

## Phase 3: Testing & Automation (Medium Priority)

### 3.1 Scripts & Testing
| Feature | Status | Effort |
|---------|--------|--------|
| Test snippets library | ❌ | Low |
| Visual test builder | ❌ | High |
| Test results dashboard | ❌ | Medium |
| Test coverage report | ❌ | Medium |
| Assertion library (pm.expect) | ✅ | Done |
| Chai-style assertions | ❌ | Low |

### 3.2 Test Snippets (Pre-built)
```
- Status code is 200
- Status code is 2xx
- Response time < 200ms
- Response has specific header
- Response body contains string
- Response is valid JSON
- JSON has required field
- JSON field equals value
- Response schema validation
```

---

## Phase 4: Performance Testing (Browser-Friendly)

### 4.1 Simple Load Testing
| Feature | Status | Effort |
|---------|--------|--------|
| Send N concurrent requests | ❌ | Medium |
| Configure concurrency level | ❌ | Low |
| Measure avg/min/max/p95/p99 | ❌ | Medium |
| Visual response time chart | ❌ | Medium |
| Export results (CSV/JSON) | ❌ | Low |

**Implementation:**
```javascript
// In browser - can use Promise.all with batching
async function loadTest(config) {
  const { url, iterations, concurrency } = config;
  const results = [];
  
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = Array(Math.min(concurrency, iterations - i))
      .fill(null)
      .map(() => sendRequest(url));
    results.push(...await Promise.all(batch));
  }
  
  return calculateStats(results);
}
```

---

## Phase 5: API Monitoring (Browser-Limited)

### 5.1 Scheduled Requests
| Feature | Status | Effort |
|---------|--------|--------|
| Schedule requests via alarms API | ❌ | Medium |
| Run every X minutes | ❌ | Low |
| Store historical results | ❌ | Low |
| Notification on failure | ❌ | Low |
| Simple dashboard | ❌ | Medium |

**Limitation:** Chrome alarms API minimum is 1 minute, runs in background

---

## Phase 6: Visualization

### 6.1 Response Visualization
| Feature | Status | Effort |
|---------|--------|--------|
| Response time waterfall | ✅ | Done |
| Response size breakdown | ❌ | Low |
| Timeline view for history | ❌ | Medium |
| Status code distribution chart | ❌ | Low |
| Response time trends | ❌ | Medium |

### 6.2 Data Visualization
| Feature | Status | Effort |
|---------|--------|--------|
| JSON → Table view | ❌ | Medium |
| JSON → Chart view (auto-detect) | ❌ | High |
| Custom visualizer (HTML/JS) | ❌ | Medium |

---

## Phase 7: Collaboration (Our Advantage)

### 7.1 Git Integration
| Feature | Status | Effort |
|---------|--------|--------|
| GitHub sync | ✅ | Done |
| Auto-sync on change | ❌ | Low |
| Conflict resolution | ❌ | Medium |
| Branch support | ❌ | Low |
| Commit message templates | ❌ | Low |
| View sync history | ❌ | Low |

### 7.2 Sharing
| Feature | Status | Effort |
|---------|--------|--------|
| Export as JSON | ✅ | Done |
| Export as cURL | ✅ | Done |
| Export as Postman Collection | ❌ | Low |
| Generate shareable link | ❌ | Medium |
| "Run in API Debugger" button | ❌ | Medium |

---

## Phase 8: Export Formats

### 8.1 Export To
| Format | Status | Effort |
|--------|--------|--------|
| JSON | ✅ | Done |
| Postman Collection v2.1 | ❌ | Low |
| OpenAPI 3.0 | ✅ | Done |
| HAR | ❌ | Low |
| Markdown docs | ✅ | Done |
| HTML docs | ✅ | Done |
| Bruno collection | ❌ | Low |

---

## Phase 9: Protocol Support

### 9.1 Current
| Protocol | Status |
|----------|--------|
| HTTP/1.1 | ✅ |
| HTTPS | ✅ |
| WebSocket | ✅ |
| SSE | ✅ |
| Socket.IO | ✅ |
| GraphQL | ✅ |

### 9.2 Future
| Protocol | Feasibility | Effort |
|----------|-------------|--------|
| gRPC | ❌ Not in browser | N/A |
| gRPC-Web | ⚠️ Requires proxy | High |
| MQTT | ⚠️ WebSocket bridge | High |
| AMQP | ❌ Not in browser | N/A |

---

## Phase 10: Developer Experience

### 10.1 Code Generation
| Language | Status |
|----------|--------|
| cURL | ✅ |
| JavaScript (fetch) | ✅ |
| JavaScript (axios) | ❌ |
| Python (requests) | ❌ |
| Python (httpx) | ❌ |
| Go | ❌ |
| Rust (reqwest) | ❌ |
| Java (OkHttp) | ❌ |
| C# (HttpClient) | ❌ |
| Ruby | ❌ |
| PHP | ❌ |
| Swift | ❌ |
| Kotlin | ❌ |

### 10.2 SDK Generation
| Type | Status | Effort |
|------|--------|--------|
| TypeScript client | ❌ | Medium |
| Python client | ❌ | Medium |

---

## Quick Wins (Next Session)

1. **Header Autocomplete** - Low effort, high impact
2. **Keyboard Shortcuts** - Low effort, high impact
3. **OpenAPI Import** - Medium effort, critical feature
4. **Postman Import** - Medium effort, critical for migration
5. **JSON Folding** - Medium effort, expected feature
6. **Welcome Screen** - Low effort, improves first impression
7. **Sample Collections** - Low effort, helps new users

---

## What We're NOT Doing

| Feature | Reason |
|---------|--------|
| CLI | Extension-only |
| Cloud backend | Privacy-first |
| User accounts | Privacy-first |
| gRPC | Browser limitation |
| Team chat | Out of scope |
| Real-time collab | Too complex |
| CI/CD integration | Extension-only |

---

## Metrics to Track

- Import success rate
- Time to first successful request
- Feature usage (which tabs used most)
- Error rates
- Export format usage

---

## Version Planning

| Version | Focus | Features |
|---------|-------|----------|
| 0.2.0 | Import/Export | OpenAPI, Postman import, improved export |
| 0.3.0 | UX Polish | Keyboard shortcuts, autocomplete, JSON folding |
| 0.4.0 | Testing | Test snippets, visual test builder |
| 0.5.0 | Performance | Load testing, response visualization |
| 0.6.0 | Collaboration | Auto-sync, conflict resolution |
| 1.0.0 | Polish | All critical features complete |
