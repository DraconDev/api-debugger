# API Debugger - Project Summary

## Goal

Build a browser-first API debugging Chrome extension that competes with Postman, Insomnia, and other API tools. The extension should capture HTTP requests, provide a full request builder, support multiple protocols (REST, WebSocket, GraphQL, SSE, Socket.IO), offer AI-powered analysis (BYOK), and provide a premium user experience - all without requiring an account.

## Philosophy

- **Extension-only approach** - no backend services needed
- **AI-first approach with BYOK** (Bring Your Own Key) for OpenAI, Anthropic, and Gemini
- **GitHub sync for backup/version control** - major competitive advantage
- **Privacy-first**: "Your AI, Your Keys, Your Data - We're Just The Tool"
- **No account required** - everything stored locally

## Architecture

```
api-debugger/
├── entrypoints/
│   ├── background.ts          # Service worker - request capture, mock interception
│   ├── popup/                 # Extension popup UI
│   └── dashboard/             # Full-screen dashboard
├── components/
│   ├── request/               # Request builder components
│   ├── protocol/              # WebSocket, SSE, Socket.IO, GraphQL clients
│   ├── CookieManager.tsx
│   ├── MockServerManager.tsx
│   ├── CollectionRunner.tsx
│   ├── ApiDocGenerator.tsx
│   ├── GitHubSyncPanel.tsx
│   ├── CertificateViewer.tsx
│   ├── RequestTemplates.tsx
│   └── ...
├── hooks/
│   ├── useRuntimeVariables.tsx
│   ├── useTheme.tsx
│   └── useKeyboardShortcuts.ts
├── lib/
│   ├── scriptExecutor.ts      # Pre/post script execution
│   └── githubSync.ts          # GitHub API integration
└── types/index.ts
```

## Storage

- `chrome.storage.sync`: Collections, environments, saved requests, settings, AI keys, GitHub config (syncs across devices)
- `chrome.storage.local`: Request history, mock servers, cert history (device-specific)

## Completed Features

| Feature | Description |
|---------|-------------|
| **Request Builder** | Full HTTP client with auth, body editors, code generation |
| **Request Capture** | Auto-capture browser requests with filters |
| **Protocols** | REST, WebSocket, GraphQL, SSE, Socket.IO |
| **Collections & Environments** | Organize requests, `{{variable}}` syntax, extraction |
| **Testing** | Pre/post scripts with Postman-compatible `pm` API |
| **Mock Servers** | Create mock endpoints, intercept requests |
| **AI Integration** | BYOK for OpenAI, Anthropic, Gemini |
| **GitHub Sync** | Push/pull to user's own repo for backup |
| **API Doc Generator** | Generate Markdown, OpenAPI 3.0, HTML |
| **Cookie Manager** | View/edit/delete cookies per domain |
| **Timing Breakdown** | DNS, connect, TLS, TTFB, download waterfall |
| **Bulk Operations** | Multi-select, bulk delete, export |
| **Request Chaining** | Extract values from responses |
| **Collection Runner** | Execute all requests in collection |
| **Diff Viewer** | Side-by-side comparison |
| **Certificate Viewer** | Inspect SSL/TLS certificates |
| **Request Templates** | Quick-start templates for common APIs |
| **Improved Popup** | Capture toggle, quick actions, deep linking |

## Competitive Advantages

- **Auto-capture browser requests** - unique to extensions
- **SSE support** - none of the competitors have it
- **Socket.IO support** - limited competitor support
- **No account required** - full functionality without login
- **GitHub sync for free** - backup/version control
- **BYOK AI** - no extra subscription
- **Full privacy** - we never see user data

## Build & Test

```bash
npm run build    # Build extension (~575KB)
npm test         # Run tests (32 passing)
```

## What We're NOT

- A SaaS platform with cloud backend
- A team collaboration tool (share via GitHub instead)
- A subscription service

---

**Status**: Feature-complete, ready for polish and testing
