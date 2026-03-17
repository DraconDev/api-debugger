# Manual Testing Checklist

> Switch to **Demo Examples** profile first (sidebar dropdown → Demo Examples).
> `npm test` covers everything else (366 tests).

## Overview (default view on open)

- [ ] Click extension icon → dashboard opens directly (no popup)
- [ ] Stats cards: Total / Success / Errors (click to filter)
- [ ] Capture toggle on/off
- [ ] Quick actions: + New Request, WebSocket, GraphQL, Test Mode, Settings
- [ ] Recent requests list → click → goes to History
- [ ] Clear All removes history

## Sending

- [ ] **Get Posts** → Send → see JSON response
- [ ] **Bearer Token** → Send → see auth echoed back
- [ ] **Toggle Headers Demo** → disable one → Send → confirm missing
- [ ] **Status Code Testing** → Send → see 418 + passing tests
- [ ] Method dropdown: GET=green, POST=blue, PUT=yellow, DELETE=red (readable contrast)

## Protocols

- [ ] WebSocket → `wss://echo.websocket.org` → send → echo → auto-scroll
- [ ] SSE → connect → stream → auto-scroll
- [ ] Socket.IO → connect → emit → response
- [ ] GraphQL → `{ __typename }` → response

## Scripts

- [ ] **Set & Use Variables** → Send → logs + variables extracted
- [ ] **Test Assertions** → Send → 3 passing tests
- [ ] **Script Error Handling** → Send → graceful 404

## Profiles (sidebar dropdown)

- [ ] Dropdown shows: Demo Examples + any custom profiles
- [ ] Switch to Demo → 21 requests load → page reloads
- [ ] Settings → Profiles → + New Profile → appears in dropdown
- [ ] Duplicate / Reset / Delete from Settings → Profiles

## AI

- [ ] Settings → AI → OpenRouter key → Test Key → ✓ valid
- [ ] Select model, add/remove/reorder fallbacks
- [ ] Send → AI Analysis → Explain → Suggest → Regenerate

## Environments

- [ ] Switch Dev/Prod/Testing → variables change
- [ ] **Get User by ID** → `{{userId}}` resolves

## Capture & Sync

- [ ] Browse → requests appear in History
- [ ] Toggle capture in Overview
- [ ] GitHub Sync → Push → verify on GitHub → Pull

## UI

- [ ] Sidebar collapse → icons only → logo not squished → **?** works
- [ ] Sidebar scrolls when nav items overflow
- [ ] Profile switcher dropdown in sidebar (not buried in settings)
- [ ] Press `?` → shortcuts modal → Escape or X to close (not click-away)
