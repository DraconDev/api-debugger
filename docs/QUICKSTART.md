# Quick Start Guide

Get API Debugger running in 5 minutes.

## Prerequisites

- Chrome or Edge browser
- Node.js (v14+)
- npm or yarn

## Step 1: Load the Extension

```bash
# Navigate to project
cd api-debugger

# No build required - extension runs from source
```

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `apps/extension` folder

✅ Extension icon should appear in your toolbar.

## Step 2: Test Request Capture

1. Open any website (e.g., https://jsonplaceholder.typicode.com)
2. Click around or make some API calls
3. Click the extension icon
4. You should see captured requests in the "History" tab

✅ Requests appear automatically as you browse.

## Step 3: Inspect a Request

1. Click on any captured request
2. View request details:
   - Method and URL
   - Headers
   - Body
   - Response headers
   - Timing

✅ You can inspect any captured request.

## Step 4: Replay a Request

1. In request details, scroll to "Replay request"
2. Optionally modify method, URL, headers, or body
3. Click "Send replay"
4. View the response

✅ You can edit and resend any request.

## Step 5: Save to Collection

1. Scroll to "Save to Collection"
2. Enter a collection name (e.g., "My APIs")
3. Click "Save Request"
4. Go to "Collections" tab to view

✅ Save important requests for later.

## Step 6: Export Requests

1. In request details, scroll to "Export"
2. Click "Copy as cURL" or "Copy as Fetch"
3. Paste in terminal or code

✅ Export requests to use elsewhere.

## Optional: Local Agent (for localhost)

If you need to access localhost or private networks:

```bash
cd apps/agent
npm install
npm start
```

Then in the extension:
1. Go to "Sync" tab
2. Click "Check Agent Status"
3. In replay section, check "Use local agent"

✅ Replay requests to localhost endpoints.

## Optional: Cloud Sync

If you want cloud sync:

```bash
cd apps/api
npm install
npm start
```

Then in the extension:
1. Go to "Sync" tab
2. Register or login
3. Collections will sync automatically

✅ Collections sync across devices.

## Troubleshooting

**Extension not capturing?**
- Refresh the page after loading extension
- Check if website is HTTPS (HTTP may not capture)
- Verify permissions in manifest

**Requests not showing?**
- Click "Refresh" button in extension
- Check service worker console (chrome://extensions → Inspect)

**Replay failing?**
- Check if URL is accessible
- For localhost, use local agent
- Check CORS headers

**Need help?**
- See full docs: `docs/README.md`
- Run diagnostics: `docs/TESTING.md`

## Next Steps

- View full documentation: `README.md`
- Run tests: `docs/TESTING.md`
- Contribute: See project structure in docs

## Project Structure

```
api-debugger/
├── apps/
│   ├── extension/      # Browser extension (main app)
│   ├── agent/          # Local agent binary
│   ├── api/            # Backend API
│   └── ai-service/     # AI explanation service
├── docs/               # Documentation
└── README.md           # Full docs
```

## Features Overview

- ✅ Automatic request capture
- ✅ Request history and search
- ✅ Detailed request inspector
- ✅ Request replay with editing
- ✅ Diff engine (compare responses)
- ✅ Diagnostics (failure analysis)
- ✅ Collections (save requests)
- ✅ Export (cURL, Fetch, JSON)
- ✅ Local agent (localhost access)
- ✅ Cloud sync (optional)
- ✅ AI explanations (optional)

That's it! You're ready to debug APIs.

For detailed guides, see `README.md`.
