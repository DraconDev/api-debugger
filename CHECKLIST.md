# Manual Testing Checklist

> Switch to **Demo Examples** profile using the sidebar dropdown.
> That IS the test mode - 21 pre-loaded requests to try every feature.
> `npm test` covers everything else (366 tests).

## Demo Profile (the test mode)

- [ ] Sidebar dropdown → select "🎯 Demo Examples" → page reloads with 21 requests
- [ ] Browse collections: REST APIs, Authentication, Scripts, Advanced Features
- [ ] Click any request → loads in builder → Send → see response
- [ ] Switch back to your profile via dropdown → your data preserved

## Overview (default view)

- [ ] Click extension icon → dashboard opens (no popup)
- [ ] Stats: Total / Success / Errors (click to filter)
- [ ] Capture toggle on/off
- [ ] Quick actions: + New Request, WebSocket, GraphQL, Collections, Settings
- [ ] Recent requests → click → History
- [ ] Clear All

## Sending (use Demo profile)

- [ ] **Get Posts** → Send → JSON response
- [ ] **Bearer Token** → Send → auth echoed back
- [ ] **Toggle Headers Demo** → disable one header → Send → confirm missing
- [ ] **Status Code Testing** → Send → 418 teapot + passing tests
- [ ] Method dropdown: GET=green, POST=blue, PUT=yellow, DELETE=red (readable)

## Protocols

- [ ] WebSocket → `wss://echo.websocket.org` → send → echo → auto-scroll
- [ ] SSE → connect → stream → auto-scroll
- [ ] Socket.IO → connect → emit → response
- [ ] GraphQL → `{ __typename }` → response

## Scripts (Demo profile)

- [ ] **Set & Use Variables** → Send → logs + variables extracted
- [ ] **Test Assertions** → Send → 3 passing tests
- [ ] **Script Error Handling** → Send → graceful 404

## AI

- [ ] Settings → AI → OpenRouter key → Test Key → ✓ valid
- [ ] Select model, add/remove/reorder fallbacks
- [ ] Send request → AI Analysis → Explain → Suggest → Regenerate

## Environments

- [ ] Switch Dev/Prod/Testing → variables change
- [ ] **Get User by ID** → `{{userId}}` resolves

## Capture & Sync

- [ ] Browse → requests appear in History
- [ ] GitHub Sync → Push → Pull

## UI

- [ ] Sidebar collapse → icons only → **?** works
- [ ] Sidebar scrolls when nav overflows
- [ ] Profile switcher in sidebar dropdown
- [ ] `?` → shortcuts modal → Escape or X to close (not click-away)
