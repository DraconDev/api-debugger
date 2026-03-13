# API Debugger

**Browser-first API debugging tool that respects your privacy.**

A Chrome extension for debugging REST, WebSocket, GraphQL, SSE, and Socket.IO APIs. No account required. Your data stays on your device.

## Why API Debugger?

| Feature | API Debugger | Postman | Insomnia |
|---------|:-----------:|:-------:|:--------:|
| **No Account Required** | ✅ | ❌ | ✅ |
| **Request Capture** | ✅ Auto | ❌ | ❌ |
| **GitHub Sync** | ✅ Free | ❌ Paid | ✅ Git |
| **AI Features** | ✅ BYOK | ✅ Paid | ✅ BYOK |
| **Full Privacy** | ✅ | ❌ Logs | ? |
| **Browser Extension** | ✅ | ❌ Desktop | ❌ Desktop |
| **WebSocket** | ✅ | ❌ | ✅ |
| **GraphQL** | ✅ | ❌ | ✅ |
| **SSE** | ✅ | ❌ | ❌ |
| **Socket.IO** | ✅ | ❌ | ✅ |
| **Mock Servers** | ✅ | ✅ | ✅ |
| **Collection Runner** | ✅ | ✅ | ✅ |
| **Pre-request Scripts** | ✅ | ✅ | ✅ |
| **API Doc Generator** | ✅ | ✅ | ✅ |
| **Free** | ✅ | Freemium | ✅ |

## Philosophy

**Your AI, Your Keys, Your Data.**

- **No vendor lock-in** - Export everything to standard formats (Postman, OpenAPI, cURL, JSON)
- **No account needed** - Start debugging immediately
- **Privacy first** - We never see your API calls, keys, or data
- **BYOK AI** - Use your own OpenAI/Anthropic/Gemini keys
- **GitHub Sync** - Backup to your own repo, version control your collections

## Features

### Request Builder
- Full HTTP request editor (method, URL, headers, body, auth)
- Support for JSON, form-data, x-www-form-urlencoded, raw, binary
- Authentication: Bearer, Basic, API Key, OAuth 2.0
- Code generation (cURL, fetch, axios, Python, Go, Java, PHP, Rust)

### Request Capture
- Automatically captures all browser HTTP requests
- Filter by method, URL patterns, domain
- View request/response details including timing breakdown

### Protocols
- **REST** - Full HTTP client
- **WebSocket** - Connect, send/receive messages
- **GraphQL** - Query editor with variables and history
- **SSE** - Server-Sent Events client
- **Socket.IO** - Full Socket.IO support with namespaces and auth

### Collections & Environments
- Organize requests into collections
- Environment variables with `{{variable}}` syntax
- Collection runner for batch execution
- Variable extraction from responses

### Testing & Scripts
- Pre-request scripts (Postman-compatible `pm` API)
- Post-response scripts for assertions and extraction
- Test runner with pass/fail reporting

### Mock Servers
- Create mock endpoints
- Configure status codes, headers, body, delays
- Intercept requests for local testing

### AI Integration (BYOK)
- Bring your own API keys (OpenAI, Anthropic, Gemini)
- Request analysis and error explanation
- Suggestions for improvements
- We never see your AI calls

### GitHub Sync
- Push/pull collections, environments, settings
- Free backup and version control
- Share with team via repo access
- Cross-device sync without accounts

### API Documentation
- Generate docs from saved requests
- Export as Markdown, OpenAPI 3.0, or HTML
- Share with your team

## Installation

### From Source

```bash
# Clone and build
git clone <repo-url>
cd api-debugger
npm install
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select .output/chrome-mv3 directory
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Create zip for Chrome Web Store
npm run zip
```

## Storage

| Data | Storage | Syncs Across Devices |
|------|---------|:--------------------:|
| Collections | `chrome.storage.sync` | ✅ |
| Environments | `chrome.storage.sync` | ✅ |
| Saved Requests | `chrome.storage.sync` | ✅ |
| Settings | `chrome.storage.sync` | ✅ |
| AI Keys | `chrome.storage.sync` | ✅ |
| Request History | `chrome.storage.local` | ❌ |
| Mock Servers | `chrome.storage.local` | ❌ |

## What We're Not

- **Not a SaaS platform** - No cloud backend, no user accounts
- **Not monetizing your data** - We never see your API calls or keys
- **Not a subscription service** - Free forever, no premium tiers
- **Not a team collaboration platform** - Share via GitHub, not our servers
- **Not an API gateway** - We debug, we don't proxy

## Privacy

- All data stored locally in your browser
- AI calls go directly from your browser to OpenAI/Anthropic/Google
- GitHub sync uses your personal access token (stored locally)
- No telemetry, no analytics, no tracking

## Tech Stack

- **Framework**: WXT (Web Extension Toolkit)
- **UI**: React 19 + TypeScript + Tailwind CSS
- **Testing**: Vitest
- **Protocols**: Native WebSocket, EventSource, socket.io-client

## License

MIT

---

*The API debugger that respects your privacy. Your data stays on your device, your AI keys stay yours, your collections sync to your GitHub.*
