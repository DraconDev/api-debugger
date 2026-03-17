# Manual Testing Checklist

> Switch to **Demo Examples** profile first (Settings → Profiles → Switch).
> `npm test` covers everything else (366 tests).

## Sending

- [ ] **Get Posts** → Send → see JSON response
- [ ] **Create Post** → Send → verify title in response
- [ ] **Bearer Token** → Send → see auth echoed back
- [ ] **Basic Auth** → Send → see `"authenticated": true`
- [ ] **Toggle Headers Demo** → disable `X-Toggle-Me` → Send → confirm it's gone from response
- [ ] **Status Code Testing** → Send → see 418 teapot response + passing tests

## Protocols

- [ ] WebSocket → connect `wss://echo.websocket.org` → send "hello" → see echo → events auto-scroll
- [ ] SSE → connect → see events stream in → auto-scroll works
- [ ] Socket.IO → connect → emit event → see response
- [ ] GraphQL → send `{ __typename }` → see response

## Scripts

- [ ] **Set & Use Variables** → Send → check logs, confirm `userName` extracted
- [ ] **Test Assertions** → Send → see 3 passing tests
- [ ] **Script Error Handling** → Send → see graceful 404 handling

## Profiles

- [ ] Settings → Profiles → **Switch** to Demo → 21 requests appear
- [ ] **+ New Profile** → create → switch to it → empty
- [ ] **Duplicate** Demo → copy appears → **Delete** copy
- [ ] **Reset** Demo → restores all 21 requests

## AI

- [ ] Settings → AI → paste OpenRouter key → **Test Key** → see "✓ valid"
- [ ] Select model, add fallback, reorder with ↑/↓, remove with ✕
- [ ] Send request → **AI Analysis** tab → see analysis → **Explain** → **Suggest** → **Regenerate**

## Environments

- [ ] Switch between Dev/Prod/Testing → variables change
- [ ] **Get User by ID** → Send → `{{userId}}` resolves from active env

## Capture & Sync

- [ ] Browse github.com → requests appear in History
- [ ] Overview → toggle capture on/off
- [ ] GitHub Sync → connect → Push → verify file on GitHub → Pull

## UI

- [ ] Click extension icon → dashboard opens directly (no popup)
- [ ] Overview page shows: stats, capture toggle, quick actions, recent requests
- [ ] Filter stats by All/Success/Errors
- [ ] Quick actions: New Request, WebSocket, GraphQL, Test Mode, Settings
- [ ] Recent requests list clickable → goes to History
- [ ] Clear All button removes history
- [ ] Sidebar collapse → icons only → logo not squished → **?** button works
- [ ] Press `?` → shortcuts modal → Escape closes
