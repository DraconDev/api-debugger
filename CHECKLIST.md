# API Debugger - Manual Testing Checklist

> Switch to the **Demo Examples** profile first (Settings → Profiles → Switch).
> Everything else is covered by `npm test` (257 tests).

## Sending Requests

- [ ] Open **Get Posts** → Send → see JSON response with 5 posts
- [ ] Open **Create Post** → Send → verify response has the title you sent
- [ ] Open **Bearer Token** → Send → see httpbin echo back your auth header
- [ ] Open **Basic Auth** → Send → see `"authenticated": true`
- [ ] Open **Multiple Headers** → Send → see httpbin echo all 4 headers back
- [ ] Open **Query Params Demo** → Send → see params reflected in response URL
- [ ] Open **Toggle Headers Demo** → disable `X-Toggle-Me` → Send → confirm it's missing from response
- [ ] Open **Toggle Headers Demo** → enable `X-Disabled` → Send → confirm it appears in response

## Browser Capture

- [ ] Open github.com in a tab → switch to History → see API requests appear
- [ ] Open popup → toggle capture off → browse → no new requests
- [ ] Toggle capture back on → new requests appear
- [ ] Type "github" in search → only matching requests shown
- [ ] Check 3 requests → click Delete → they disappear
- [ ] Check 2 requests → click Export → JSON file downloads

## WebSocket

- [ ] Open WebSocket view → connect to `wss://echo.websocket.org`
- [ ] Type "hello" → Send → see "hello" in message list
- [ ] Verify messages auto-scroll (no toggle visible)
- [ ] Click Disconnect → status shows "Disconnected"

## SSE

- [ ] Open SSE view → enter an SSE endpoint URL → Connect
- [ ] See events streaming in real-time
- [ ] Toggle Auto-reconnect on → disconnect → watch it reconnect
- [ ] Verify events auto-scroll (no toggle visible)

## Socket.IO

- [ ] Open Socket.IO view → connect to a Socket.IO server
- [ ] Type event name "chat" + data → Emit → see response
- [ ] Add "user:join" to listen events → receive join events
- [ ] Click Clear → event list empties

## GraphQL

- [ ] Open GraphQL view → enter `{ __typename }` → Send → see response
- [ ] Enter a mutation → Send → confirm it executes
- [ ] Add variables `{"id": "1"}` → Send → variables are sent

## Profiles

- [ ] Settings → Profiles → see **Demo Examples** with 🎯 icon and "Built-in" badge
- [ ] Click **Switch** on Demo → page reloads → 21 requests in collections sidebar
- [ ] Click **+ Demo** in collections header → demo data loads into current profile
- [ ] Click **+ New Profile** → type "My Project" → Create → empty collections
- [ ] Switch to Demo → switch back to "My Project" → confirm data persisted
- [ ] Click **Duplicate** on Demo → "Demo Examples (copy)" appears
- [ ] Delete the copy → confirm it's removed
- [ ] Click **Reset** on Demo → confirm 21 requests restored
- [ ] Confirm no Delete button on Demo (built-in protection)

## AI Integration

- [ ] Settings → AI → paste OpenRouter key → click **Test Key** → see "✓ valid"
- [ ] Clear key → Test Key → see "✗ failed"
- [ ] Type "gpt" in model search → OpenAI models appear
- [ ] Select "openai/gpt-4.1-mini" as primary
- [ ] Click a fallback model → see it added as #1
- [ ] Click ↑ to reorder → click ✕ to remove
- [ ] Save → reload Settings → confirm settings persisted
- [ ] Open any demo request → Send → click **AI Analysis** tab → see analysis
- [ ] Click **Explain** tab → see endpoint explanation
- [ ] Click **Suggest** tab → see optimization tips
- [ ] Click **Regenerate** → get fresh analysis
- [ ] Verify model name shown matches your selection

## Environments

- [ ] Settings → Environments → see 3 demo environments (Dev, Prod, Testing)
- [ ] Dev is active (green dot) → has `baseUrl`, `apiKey`, `userId`
- [ ] Open **Get User by ID** → Send → uses `{{userId}}` from Dev env
- [ ] Switch to Testing → Send again → `{{userId}}` resolves to Testing's value
- [ ] Create new env → add `baseUrl=http://localhost:3000` → set active
- [ ] Toggle a variable off → Send → confirm it resolves to empty

## Pre/Post Scripts

- [ ] Open **Set & Use Variables** → Send → check response panel for script logs
- [ ] Confirm `userName` and `userEmail` were extracted (visible in variables)
- [ ] Open **Test Assertions** → Send → see "3 passing" test results
- [ ] Open **Script Error Handling** → Send → see graceful handling of 404
- [ ] Open **Chained Request** → Send → uses `{{userId}}` set by previous request

## Test Mode

- [ ] Click **Test Mode** in sidebar → see 14 pre-loaded API examples
- [ ] Click "JSONPlaceholder - Posts" → Send → see response
- [ ] Click "HTTPBin - Headers" → Send → see your headers echoed
- [ ] Click an auth example → confirm auth header is included

## Workflow Simulator

- [ ] Click **Workflows** in sidebar → add a request
- [ ] Set iterations=10, concurrency=2 → Start
- [ ] See RPS, avg/min/max duration updating in real-time
- [ ] See pass/fail counts incrementing
- [ ] Click Stop → workflow halts
- [ ] Click Clear → workflow resets

## GitHub Sync

- [ ] Settings → Sync → **Create GitHub Token** (opens GitHub in new tab)
- [ ] Generate token → paste → Connect → see "Connected as @username"
- [ ] Set repo name → Save Settings
- [ ] Click **Push** → "Successfully pushed to GitHub"
- [ ] Open GitHub → confirm `api-debugger-sync.json` exists
- [ ] Click **Pull** → "Successfully pulled from GitHub"
- [ ] Confirm "Last sync" timestamp updated
- [ ] Disconnect → confirm token cleared

## Sidebar & Navigation

- [ ] Click chevron → sidebar shrinks to icons → logo not squished
- [ ] Click chevron again → sidebar expands with text labels
- [ ] Click **?** in footer → navigates to Settings
- [ ] **?** visible in both collapsed and expanded sidebar
- [ ] Click each nav item → correct view loads
- [ ] Footer shows correct request count

## Popup

- [ ] Click extension icon → popup opens
- [ ] Shows correct total/success/error counts
- [ ] Click "Success" filter → only success requests shown
- [ ] Click "Errors" → only error requests shown
- [ ] Click "New" → dashboard opens with request builder
- [ ] Click "WS" → dashboard opens with WebSocket view
- [ ] Click a recent request → dashboard opens in History
- [ ] Click "Open Dashboard" → full dashboard in new tab
- [ ] Toggle capture → works

## Keyboard Shortcuts

- [ ] Press `?` → shortcuts modal opens
- [ ] Press Escape → modal closes

## Theme

- [ ] Extension loads in dark theme
- [ ] All text readable, colors consistent
- [ ] Red = destructive, green = success, yellow = warning
- [ ] No hardcoded colors (all use CSS variables)

---

**~45 manual items. Run `npm test` for the other 257.**
