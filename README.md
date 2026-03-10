# API Debugger - Complete Documentation

## Overview

API Debugger is a browser-first API debugging tool that helps developers understand, fix, and replay broken requests faster than generic API clients.

## Features

### Core Features
- **Request Capture**: Automatically captures HTTP/HTTPS requests from browser tabs
- **Request History**: View and search through captured requests
- **Request Details**: Inspect headers, body, timing, and response data
- **Request Replay**: Edit and resend any captured request
- **Diff Engine**: Compare original vs replayed request/response
- **Diagnostics**: Automatic failure analysis for common issues
- **Collections**: Save and organize important requests
- **Export**: Copy as cURL, Fetch, or JSON
- **Local Agent**: Access localhost and private network endpoints

### Advanced Features
- AI-powered explanations (requires backend)
- Cloud sync for collections (requires backend)
- Multi-tab request filtering

## Installation

### Extension

1. Open Chrome/Edge
2. Navigate to `chrome://extensions` (or `edge://extensions`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `apps/extension` directory
6. The extension icon should appear in your toolbar

### Local Agent (Optional)

Required for localhost/private network access:

```bash
cd apps/agent
npm install
npm start
```

The agent runs on `http://localhost:47321` by default.

### Backend API (Optional)

Required for cloud sync and AI features:

```bash
cd apps/api
npm install
npm start
```

The API runs on `http://localhost:4321` by default.

### AI Service (Optional)

Required for AI explanations:

```bash
cd apps/ai-service
npm install
npm start
```

The AI service runs on `http://localhost:3456` by default.

## Usage Guide

### Basic Workflow

1. **Capture Requests**
   - Browse any website
   - Requests are automatically captured
   - Click extension icon to view history

2. **Inspect Requests**
   - Click any request in the list
   - View method, URL, headers, body, response
   - See timing and status code

3. **Analyze Failures**
   - Failed requests (4xx, 5xx) show diagnostics
   - View likely causes and suggestions
   - Check evidence for root cause

4. **Replay Requests**
   - Click "Replay request" section
   - Edit method, URL, headers, or body
   - Click "Send replay"
   - View results and diff

5. **Save to Collections**
   - Scroll to "Save to Collection" section
   - Choose or create a collection
   - Add name and tags
   - Click "Save Request"

6. **Export Requests**
   - Scroll to "Export" section
   - Click "Copy as cURL", "Copy as Fetch", or "Copy as JSON"
   - Paste in your code or terminal

### Using Collections

1. Click "Collections" tab in main view
2. View all saved collections
3. Click a collection to view saved requests
4. Click a saved request to view details
5. Replay saved requests directly

### Using Local Agent

1. Start the agent: `npm start` in `apps/agent`
2. Open extension, go to "Sync" tab
3. Click "Check Agent Status" to verify connection
4. In replay section, check "Use local agent"
5. Replay requests to localhost or private IPs

### Using Cloud Sync

1. Start the backend API
2. Go to "Sync" tab in extension
3. Register or login
4. Collections automatically sync when logged in
5. Click "Sync Now" to force sync

## Architecture

```
┌─────────────────────────────────────────────┐
│           Browser Extension                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Capture │  │   UI     │  │  Replay   │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  │
│       │            │              │         │
│  ┌────▼────────────▼──────────────▼──────┐ │
│  │         Background Service            │ │
│  └──────────────────┬────────────────────┘ │
└─────────────────────┼───────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼─────┐ ┌────▼────┐ ┌────▼──────┐
    │  Agent   │ │   API   │ │AI Service │
    │(Local)   │ │(Cloud)  │ │ (Cloud)   │
    └──────────┘ └─────────┘ └───────────┘
```

### Components

#### Extension (`apps/extension`)
- **manifest.json**: Extension configuration
- **background.js**: Request capture, storage, message handling
- **panel/**: UI components
- **utils/**: Helper modules (diff, diagnostics, export, collections, sync, agent)

#### Local Agent (`apps/agent`)
- Lightweight Node.js server
- Proxies requests to localhost/private networks
- Runs locally on port 47321

#### Backend API (`apps/api`)
- User authentication
- Collection storage
- Sync service

#### AI Service (`apps/ai-service`)
- Request analysis
- Explanation generation
- Sanitization of sensitive data

## API Reference

### Extension APIs

#### `background.js`

**Message Types:**
- `GET_REQUESTS`: Retrieve captured requests
- `REPLAY_REQUEST`: Replay a request

**Storage Keys:**
- `requests`: Captured request history
- `collections`: User collections
- `savedRequests`: Saved request items

#### Utility Modules

**`diff.js`**
```javascript
window.diffStatus(original, replay)
window.diffHeaders(original, modified)
window.diffText(original, modified)
```

**`diagnostics.js`**
```javascript
window.analyzeRequest(record)
// Returns array of diagnostics
```

**`export.js`**
```javascript
window.exportHelpers.toCurl(record)
window.exportHelpers.toFetch(record)
window.exportHelpers.toJson(record)
window.exportHelpers.copyToClipboard(text)
```

**`collections.js`**
```javascript
window.collectionsHelpers.getAllCollections()
window.collectionsHelpers.createCollection(name, description)
window.collectionsHelpers.saveRequestToCollection(collectionId, request, name, tags)
window.collectionsHelpers.getRequestsByCollection(collectionId)
```

**`sync.js`**
```javascript
window.syncService.login(email, password)
window.syncService.register(email, password)
window.syncService.logout()
window.syncService.syncCollections()
```

**`agent.js`**
```javascript
window.agentService.checkAgentHealth()
window.agentService.replayViaAgent(request)
window.agentService.discoverLocalPorts(ports)
```

### Local Agent API

**Base URL:** `http://localhost:47321`

#### Health Check
```
GET /health
Response: { status, version, uptime, timestamp }
```

#### Replay Request
```
POST /replay
Body: { url, method, headers, body, timeout }
Response: { success, status, statusText, headers, body, duration }
```

#### Discover Endpoints
```
POST /discover
Body: { ports: [3000, 8080, ...] }
Response: { success, results: [{ port, status, available }] }
```

### Backend API

**Base URL:** `http://localhost:4321`

#### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

#### Collections
```
GET /api/collections
POST /api/collections
PUT /api/collections/:id
DELETE /api/collections/:id
```

#### Saved Requests
```
GET /api/saved-requests
POST /api/saved-requests
PUT /api/saved-requests/:id
DELETE /api/saved-requests/:id
```

#### Sync
```
POST /api/sync/push
GET /api/sync/pull
```

### AI Service API

**Base URL:** `http://localhost:3456`

#### Explain Request
```
POST /api/explain
Body: { request, diagnostics }
Response: { success, explanation }
```

## Troubleshooting

### Extension Not Capturing Requests

1. Check permissions in `manifest.json`
2. Ensure `webRequest` permission is granted
3. Refresh the page after installing extension
4. Check service worker console for errors

### Replay Failing

1. Check if URL is accessible
2. For localhost URLs, ensure agent is running
3. Check CORS headers on target server
4. Verify request body format

### Agent Connection Failed

1. Verify agent is running: `curl http://localhost:47321/health`
2. Check port 47321 is not blocked
3. Try different port: `apidbg serve 3000`
4. Check firewall settings

### Sync Not Working

1. Verify backend API is running
2. Check network tab for API errors
3. Ensure valid authentication token
4. Try logging out and back in

### Diagnostics Not Showing

1. Only appears on failed requests (4xx, 5xx)
2. Check if `diagnostics.js` is loaded
3. Verify request has necessary data (headers, status)

## Development

### Building

No build step required - extension runs directly from source.

### Testing

```bash
# Test local agent
cd apps/agent
npm start
curl http://localhost:47321/health

# Test backend API
cd apps/api
npm start
curl http://localhost:4321/health

# Test AI service
cd apps/ai-service
npm start
curl http://localhost:3456/health
```

### Debugging

**Extension:**
1. Go to `chrome://extensions`
2. Click "Inspect views: service worker"
3. Check console for logs

**Agent/API/AI Service:**
- Check terminal output
- Logs print to stdout

## Limitations

### Browser Extension
- Cannot capture WebSocket frames (future feature)
- Response body limited by Chrome's webRequest API
- Some headers may be redacted by browser

### Local Agent
- Only HTTP/HTTPS protocols
- Request body limited to 1MB
- Requires manual startup

### Backend API
- In-memory storage (data lost on restart)
- No password hashing (dev only)
- No rate limiting

### AI Service
- Mock responses by default
- Requires API key for real AI
- No streaming responses

## Future Enhancements

- [ ] WebSocket debugging
- [ ] GraphQL support
- [ ] gRPC support
- [ ] OpenAPI/Swagger integration
- [ ] Request recording and playback
- [ ] Team collaboration
- [ ] Custom themes
- [ ] Keyboard shortcuts
- [ ] Request templates
- [ ] Environment variables
- [ ] Mock server
- [ ] Performance metrics
- [ ] Automated testing

## Contributing

Contributions welcome! Areas to help:

1. **Testing**: Test with real APIs, report bugs
2. **Documentation**: Improve guides, add examples
3. **Features**: Implement items from roadmap
4. **Diagnostics**: Add more failure detection rules
5. **UI/UX**: Improve interface design

## License

MIT

## Support

- GitHub Issues: [Report bugs, request features]
- Documentation: This file + docs/ folder
- Email: (Add contact if applicable)
