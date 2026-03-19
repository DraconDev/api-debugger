# API Debugger

**Stop creating accounts to debug your own API traffic.**

A Chrome extension that sees every HTTP request your browser makes. No login. No cloud. No "verify your email to continue."

[![Tests](https://img.shields.io/badge/tests-956%20passing-green)]()
[![CI](https://github.com/DraconDev/api-debugger/actions/workflows/ci.yml/badge.svg)](https://github.com/DraconDev/api-debugger/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

[Install from Chrome Web Store](https://chrome.google.com/webstore/) · [Firefox Add-on](https://addons.mozilla.org/) · [Source Code](https://github.com/DraconDev/api-debugger)

---

## The Story

I was debugging an API at 11pm. Postman wanted to verify my email. Again.

So I built a Chrome extension that captures every request my browser makes. No account. No login. No "sorry, free tier requires email verification."

It works like this:

1. You browse the web like normal
2. Every HTTP request gets captured automatically
3. Open the extension, see everything, replay or modify any request

That's it.

---

## What It Does

**Capture Mode**

- Sees every HTTP request your browser sends
- View headers, body, status, timing
- Filter by domain, method, status

**Build Mode**

- REST, WebSocket, GraphQL, SSE, Socket.IO
- Headers, params, body, auth
- Pre-request scripts (Postman-compatible)
- Collections, environments, variables

**Import**

- Postman, Insomnia, OpenAPI, HAR, cURL
- No lock-in, export anytime

---

## Why This Exists

|                       | API Debugger | Postman | Insomnia |
| --------------------- | :----------: | :-----: | :------: |
| No account            |      ✅      |   ❌    |    ✅    |
| Auto-capture          |      ✅      |   ❌    |    ❌    |
| Browser-native        |      ✅      |   ❌    |    ❌    |
| Your data stays yours |      ✅      |   ❌    |    ?     |

Postman logs your API calls. Insomnia works but is desktop-only. We wanted something that Just Works, stores nothing in the cloud, and respects your privacy.

---

## Privacy

- **No account required**
- **No telemetry, no analytics, no tracking**
- **All data stored locally in your browser**
- **GitHub sync uses YOUR token** - we never see it
- **AI calls go direct to your API key** - we never see it

---

## Installation

```bash
git clone https://github.com/DraconDev/api-debugger.git
cd api-debugger
npm install
npm run build
```

Then:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `.output/chrome-mv3/`

For Firefox: use `.output/firefox-mv2/`

---

## Tech Stack

React 19 · TypeScript · Tailwind CSS · WXT · Vitest

---

## License

MIT

---

_Stop creating accounts to debug your own API traffic._
