# API Debugger - Manual Testing Checklist

> These are the things that actually need a human to verify.
> Everything else is covered by `npm test` (257 tests).

## Sending Requests

- [ ] Send a GET request to `https://jsonplaceholder.typicode.com/posts` and see the response
- [ ] Send a POST with JSON body, verify the response reflects the sent data
- [ ] Send a request with Bearer auth, confirm it works against httpbin.org/bearer
- [ ] Send a request with Basic auth, confirm it works against httpbin.org/basic-auth
- [ ] Toggle a header off, send request, verify header was not sent
- [ ] Add a query param, verify it appears in the request URL shown in history

## Browser Capture

- [ ] Open a website that makes API calls (e.g. github.com), see requests appear in history
- [ ] Toggle capture off in the popup, browse a site, confirm no new requests captured
- [ ] Toggle capture back on, confirm requests start appearing again
- [ ] Search requests in history by URL fragment
- [ ] Select multiple requests with checkboxes, delete them
- [ ] Export selected requests, confirm file downloads

## WebSocket

- [ ] Connect to `wss://echo.websocket.org`, send a message, see it echoed back
- [ ] Verify events auto-scroll as new messages arrive (no scroll toggle visible)
- [ ] Disconnect, confirm status shows "Disconnected"
- [ ] Type a URL with query params, connect, confirm it works

## SSE

- [ ] Connect to an SSE endpoint, see events stream in real-time
- [ ] Toggle auto-reconnect on, disconnect, confirm it reconnects
- [ ] Verify events auto-scroll (no toggle visible)

## Socket.IO

- [ ] Connect to a Socket.IO server, send an event, see response
- [ ] Add a custom listen event name, receive events with that name
- [ ] Clear events, confirm list is empty

## GraphQL

- [ ] Send `{ __typename }` to a GraphQL endpoint, see response
- [ ] Send a mutation, confirm it executes
- [ ] Send a query with variables, confirm variables are sent

## Profiles

- [ ] Settings → Profiles, see "Demo Examples" built-in profile
- [ ] Click "Switch" on Demo, page reloads with 16 demo requests in collections
- [ ] Click "+ Demo" in collections sidebar header, demo data loads into current profile
- [ ] Click "Load Demo Examples" in empty collections state, demo data appears
- [ ] Create a new profile, switch to it, confirm collections are empty
- [ ] Switch back to Demo, confirm demo data is still there
- [ ] Duplicate a profile, confirm copy has same data
- [ ] Delete a custom profile, confirm it's gone
- [ ] Click "Reset" on Demo, confirm it restores to default 16 requests
- [ ] Verify built-in profiles cannot be deleted (no delete button)

## AI Integration

- [ ] Enter an OpenRouter API key in Settings → AI
- [ ] Click "Test Key", see "✓ API key is valid" message
- [ ] Clear the key, click "Test Key", see error
- [ ] Search for a model in the model list, find it
- [ ] Select a primary model from the list
- [ ] Add a fallback model, see it appear in the fallback list
- [ ] Reorder fallbacks with ↑/↓ arrows
- [ ] Remove a fallback with ✕ button
- [ ] Save settings, reload, confirm settings persisted
- [ ] Send a request, click "AI Analysis", see analysis results
- [ ] Click "Explain" tab, see endpoint explanation
- [ ] Click "Suggest" tab, see optimization suggestions
- [ ] Click "Regenerate", get a fresh analysis
- [ ] Verify the model name shown matches your selected model

## Environments

- [ ] Settings → Environments, create a new environment
- [ ] Add a variable `baseUrl` with value `https://api.example.com`
- [ ] Set it as active
- [ ] In request builder, use `{{baseUrl}}/path`, send request, verify it resolves
- [ ] Toggle a variable off, send request, confirm it resolves to empty
- [ ] Switch to a different environment, confirm variables change
- [ ] Delete an environment, confirm it's removed

## Pre/Post Scripts

- [ ] In demo profile, select "Set & Use Variables" request
- [ ] Send it, check console output for script logs
- [ ] Check that `userName` and `userEmail` variables were set by the script
- [ ] Select "Test Assertions" request, send it
- [ ] Check that test results show 3 passing tests
- [ ] Add a pre-request script that will fail, confirm error is shown

## Test Mode

- [ ] Navigate to Test Mode from sidebar
- [ ] See 14 pre-loaded API examples listed
- [ ] Click "JSONPlaceholder - Posts", send it, see response
- [ ] Click "HTTPBin - Headers", send it, see your headers reflected
- [ ] Click an auth example, confirm it includes auth

## Workflow Simulator

- [ ] Navigate to Workflows from sidebar
- [ ] Add a request to the workflow
- [ ] Set iterations to 10, concurrency to 2
- [ ] Click Start, see metrics update in real-time (RPS, avg duration)
- [ ] See assertion pass/fail counts update
- [ ] Click Stop, confirm workflow halts
- [ ] Clear workflow, confirm it resets

## GitHub Sync

- [ ] Settings → Sync, click "Create GitHub Token" (opens GitHub in new tab)
- [ ] Paste a PAT, click "Connect"
- [ ] See "Connected as @username" message
- [ ] Change repo name to something unique, click "Save Settings"
- [ ] Click "Push", see "Successfully pushed to GitHub"
- [ ] Open GitHub, confirm the sync file exists in the repo
- [ ] Click "Pull", see "Successfully pulled from GitHub"
- [ ] Check "Last sync" timestamp updated
- [ ] Click "Disconnect", confirm token is cleared

## Sidebar & Navigation

- [ ] Click chevron to collapse sidebar, confirm it shrinks to icons only
- [ ] Logo image stays visible and not squished when collapsed
- [ ] Click chevron again, sidebar expands with text labels
- [ ] Click "?" in sidebar footer, navigates to Settings
- [ ] "?" visible in both collapsed and expanded states
- [ ] Click each nav item (builder, WS, SSE, Socket.IO, etc.), correct view loads
- [ ] Request count in footer updates as new requests are captured

## Popup

- [ ] Click extension icon, popup opens
- [ ] Shows correct request count
- [ ] Quick stats show correct Total/Success/Errors counts
- [ ] Click "All", "Success", "Errors" filter buttons, list filters correctly
- [ ] Click "New" quick action, opens dashboard with request builder
- [ ] Click "WS" quick action, opens dashboard with WebSocket view
- [ ] Click a recent request, opens dashboard history view
- [ ] Click "Open Dashboard", full dashboard opens in new tab
- [ ] Capture toggle on/off works (same as tested above)
- [ ] Click trash icon, history clears

## Keyboard Shortcuts

- [ ] Press `?` anywhere, shortcuts modal opens
- [ ] Modal lists all available shortcuts
- [ ] Press Escape, modal closes

## Theme

- [ ] Extension loads in dark theme by default
- [ ] All text is readable, colors look correct
- [ ] Destructive actions are red, success is green, warnings are yellow
- [ ] No hardcoded colors visible (everything uses theme variables)

---

**~50 items that need a human. Everything else is `npm test`.**
