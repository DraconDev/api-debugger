# API Debugger - Feature Roadmap

## Our Philosophy

**Your AI, Your Keys, Your Data.**

We believe:
- Developers should own their data
- Tools shouldn't require accounts
- Privacy is a right, not a premium feature
- No vendor lock-in - you can export everything

## What We ARE

- A **browser extension** for API debugging
- **Privacy-first** - all data stays on your device
- **BYOK AI** - use your own keys, no extra subscription
- **GitHub sync** - backup to your own repo
- **Free and open** - no accounts, no subscriptions

## What We're NOT

- A SaaS platform with cloud backend
- A team collaboration tool (share via GitHub instead)
- An API gateway or proxy service
- A subscription service with premium tiers
- A data collection platform

## Current Features

| Category | Features |
|----------|----------|
| **Request Builder** | Full HTTP client, auth, body editors, code generation |
| **Protocols** | REST, WebSocket, GraphQL, SSE, Socket.IO |
| **Capture** | Auto-capture browser requests with filters |
| **Collections** | Organize requests, environments, variables |
| **Testing** | Pre/post scripts, assertions, collection runner |
| **Mock Servers** | Create mock endpoints for local testing |
| **AI** | BYOK - OpenAI, Anthropic, Gemini |
| **Sync** | GitHub sync for backup and version control |
| **Docs** | Generate Markdown, OpenAPI, HTML documentation |
| **Tools** | Cookie manager, diff viewer, timing breakdown |

## Potential Future Features

### High Value, Fits Philosophy

| Feature | Description | Why It Fits |
|---------|-------------|-------------|
| **Certificate Viewer** | View SSL/TLS certs for requests | Security, privacy-focused |
| **Request Templates** | Pre-built templates for common APIs | Onboarding, no backend needed |
| **Response Search** | Search across all captured responses | Utility, local storage |
| **Performance Tracking** | Track API latency over time | Value, stored locally |
| **Scheduled Requests** | Run requests periodically via alarms API | Utility, uses Chrome APIs |
| **API Health Checks** | Simple uptime monitoring | Value, local storage |
| **Encrypted Variables** | Encrypt sensitive vars with master password | Security, privacy |
| **SDK Generation** | Generate client SDKs from requests | Utility, no backend |
| **Keyboard Navigation** | Full keyboard-first experience | Power users |

### Considered But Not Aligned

| Feature | Why Not |
|---------|---------|
| **Team Collaboration** | Requires accounts/backend - use GitHub sync instead |
| **Cloud Mock Servers** | Requires our backend - mocks are local only |
| **Shared Workspaces** | Requires accounts - use GitHub repos |
| **Built-in AI** | We're BYOK only - users bring their own keys |
| **Usage Analytics** | Privacy-first - we don't track anything |
| **Cloud Backup** | Use GitHub sync instead |

## Architecture Decisions

### Storage Strategy

```
chrome.storage.sync (syncs across devices):
├── Collections
├── Environments  
├── Saved Requests
├── Settings
├── AI Keys (encrypted)
└── GitHub Config

chrome.storage.local (device-specific):
├── Request History (can be large)
└── Mock Servers
```

### No Backend Required

Everything runs in the browser:
- AI calls go directly to OpenAI/Anthropic/Google
- GitHub sync uses user's personal access token
- All data stored in Chrome storage
- No server-side processing

### Extension-Only Approach

Why we don't have a desktop app:
- Extensions can capture browser requests (unique advantage)
- No installation friction
- Cross-platform by default
- Always available in browser context

## Competitive Positioning

### vs Postman
- ✅ No account required
- ✅ Free forever (no $12/mo)
- ✅ Privacy-first (no logging)
- ✅ GitHub sync (vs their cloud lock-in)
- ❌ No team collaboration (but GitHub works)
- ❌ No cloud mock servers

### vs Insomnia
- ✅ Browser extension (capture advantage)
- ✅ SSE support
- ✅ Socket.IO support
- ✅ Auto-capture requests
- ❌ No gRPC support

### vs Talend API Tester
- ✅ WebSocket, GraphQL, SSE, Socket.IO
- ✅ Pre-request scripts
- ✅ Mock servers
- ✅ GitHub sync
- ✅ Modern UI

## Revenue (If Ever Needed)

We're free. If that changes:

1. **Team Features** (requires accounts)
   - Shared workspaces
   - Comments and collaboration
   - Audit logs

2. **Cloud Features** (optional add-on)
   - Hosted mock servers
   - API monitoring
   - Team sync

3. **Enterprise**
   - SSO integration
   - Dedicated support
   - Custom features

**Core features will always be free.**
