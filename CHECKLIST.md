# Manual Testing Checklist

> Switch to **Demo Examples** profile using the sidebar dropdown first.
> Demo has 26 pre-loaded requests across 4 collections.
> `npm test` covers everything else (366 tests).

## Profile Dropdown (sidebar top)

- [ ] Dropdown shows "🏠 My Workspace" and "🎯 Demo Examples"
- [ ] Switch to Demo Examples → page reloads with 26 requests
- [ ] Switch back to My Workspace → empty collections
- [ ] Click a request in collections → detail panel appears on right
- [ ] Click "Open in Builder" → request loads in builder for editing
- [ ] Back arrow (←) returns to request list

## Overview (default view)

- [ ] Stats cards: Total / Success / Errors (click to filter)
- [ ] Capture toggle on/off
- [ ] Quick actions work: + New Request, WebSocket, GraphQL, Collections, Settings
- [ ] AI nudge shows when no API key configured
- [ ] Recent requests → click → opens History

## Sending Requests (Demo profile)

- [ ] **Get Posts** → Send → JSON response with posts
- [ ] **Bearer Token** → Send → httpbin echoes auth header
- [ ] **Basic Auth** → Send → `"authenticated": true`
- [ ] **Toggle Headers Demo** → disable a header → Send → confirm it's missing
- [ ] **Status Code Testing** → Send → 418 response + passing tests
- [ ] Method dropdown: GET=green, POST=blue, PUT=orange, DELETE=red (readable)

## New Demo Requests

- [ ] **Redirect Chain** → follows 302 redirect
- [ ] **Slow Response (2s delay)** → shows duration > 2000ms
- [ ] **Compressed Response** → handles gzip
- [ ] **HTML Response** → returns rendered HTML
- [ ] **XML Response** → returns XML

## Protocols

- [ ] WebSocket → `wss://echo.websocket.org` → send → echo → auto-scroll
- [ ] SSE → connect → stream → auto-scroll
- [ ] Socket.IO → connect → emit → response
- [ ] GraphQL → `{ __typename }` → response

## Scripts (Demo profile)

- [ ] **Set & Use Variables** → Send → logs + variables extracted
- [ ] **Test Assertions** → Send → 3 passing tests
- [ ] **Script Error Handling** → Send → graceful 404 handling

## AI Assistant

- [ ] Settings → AI → OpenRouter key → Test Key → "✓ API key is valid"
- [ ] Select model from searchable list (346 models)
- [ ] Add up to 3 fallbacks with ↑/↓ reorder and ✕ remove
- [ ] Send request → AI tab → ask "what's wrong with this?"
- [ ] Quick actions: "What's wrong?", "Explain response", "Fix it", "cURL", "Test script"

## Environments

- [ ] Switch Dev/Prod/Testing → variables change
- [ ] **Get User by ID** → `{{userId}}` resolves from env

## Settings → Profiles

- [ ] See My Workspace and Demo Examples listed
- [ ] Create new profile → appears in sidebar dropdown
- [ ] Duplicate a profile → copy appears
- [ ] Delete custom profile → removed
- [ ] Reset Demo → restores 26 requests

## Capture & Sync

- [ ] Browse web → requests appear in History
- [ ] GitHub Sync → connect → Push → Pull

## UI

- [ ] Sidebar collapse → icons only → ? button works
- [ ] Sidebar scrolls when nav overflows
- [ ] `?` → shortcuts modal → Escape or X to close (not click-away)
- [ ] Press `?` anywhere opens shortcuts
